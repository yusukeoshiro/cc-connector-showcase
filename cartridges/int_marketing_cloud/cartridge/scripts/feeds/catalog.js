'use strict';

/**
 * @module feeds/catalog
 */

/**
 * @type {dw.catalog.ProductSearchModel}
 */
const ProductSearchModel = require('dw/catalog/ProductSearchModel');
/**
 * @type {dw.catalog.CatalogMgr}
 */
const CatalogMgr = require('dw/catalog/CatalogMgr');

/**
 * @type {module:models/export~Export}
 */
const Export = require('../models/export');

/**
 * @type {module:models/export~Export}
 * @see https://help.marketingcloud.com/en/documentation/personalization_builder/personalization_builder_prerequisites/catalog/add_attributes/
 */
var exportModel;

/**
 * @type {dw.catalog.ProductSearchModel}
 */
var PSM;

function beforeStep(parameters, stepExecution) {
    exportModel = new Export(parameters, function(em){
        PSM = new ProductSearchModel();
        PSM.setCategoryID(CatalogMgr.siteCatalog.root.ID);
        PSM.setRecursiveCategorySearch(true);
        PSM.search();
        return PSM.getProducts();
    });
    exportModel.writeHeader();
}

function getTotalCount(parameters, stepExecution) {
    return PSM.getCount();
}

function read(parameters, stepExecution) {
    return exportModel.readNext();
}

/**
 * Returns https image link, as long as image type is defined in the property configuration
 * @param cfg
 * @param data
 * @returns {dw.web.URL}
 */
function imageLink(cfg, data) {
    if (cfg.hasOwnProperty('imageType')) {
        var img = data.Product.getImage(cfg.imageType);
        if (img) {
            return img.absURL.https().toString();
        }
    }
}

/**
 * Returns an array of image links
 * @param cfg
 * @param data
 * @returns {Array}
 */
function images(cfg, data) {
    if (cfg.hasOwnProperty('imageType')) {
        var images = data.Product.getImages(cfg.imageType);
        if (!empty(images)) {
            return images.toArray().map(function(imgFile){
                return imgFile.absURL.https().toString();
            });
        }
    }
}

/**
 * Returns the base price for a product (using pricebook inheritance to determine price ancestor)
 * @param cfg
 * @param data
 * @returns {dw.util.Decimal|void}
 */
function standardPrice(cfg, data) {
    var stdPrice;
    var priceModel;

    if (!empty(data.Product.getPriceModel())) {
        priceModel = data.Product.getPriceModel();
    } else {
        if (!data.Product.isMaster() && data.Product.getMasterProduct() && !empty(data.Product.masterProduct.getPriceModel())) {
            priceModel = data.Product.masterProduct.getPriceModel();
        } else if (data.Product.isMaster() || data.Product.isVariationGroup()) {
            priceModel = data.Product.getVariationModel().getDefaultVariant().getPriceModel();
        }
    }

    if (!empty(priceModel) && priceModel.price.available) {
        var priceBook = priceModel.priceInfo.priceBook;

        while (priceBook.parentPriceBook) {
            priceBook = priceBook.parentPriceBook ? priceBook.parentPriceBook : priceBook;
        }

        stdPrice = priceModel.getPriceBookPrice(priceBook.ID);
        return stdPrice.decimalValue;
    }
}

/**
 * @param {dw.catalog.Product} product
 * @param parameters
 * @param stepExecution
 * @returns {void|Function}
 */
function process(product, parameters, stepExecution) {
    var skip = false;
    if (exportModel.isIncremental) {
        if (product.lastModified < exportModel.lastExported) {
            skip = true;
        }
    }

    // skip offline, product set, product bundle, and variant (variants handled by writeProduct() )
    if (!product.isOnline() || product.isProductSet() || product.isBundle() || product.isVariant()) {
        skip = true;
    }
    if (!skip) {
        return function outputProduct(writeNextCB){
            writeProduct(product, parameters, writeNextCB);
        };
    }
}

/**
 * This method will write out any products in the search index, that are allowed by job preferences.
 *
 * @param {dw.catalog.Product} product
 * @param parameters
 * @param {Function} writeNextCB
 */
function writeProduct(product, parameters, writeNextCB){
    var data;

    // output master, or variation group, or simple product
    if (
        (product.isMaster() && parameters.IncludeMasterProduct === true) ||
        (product.isVariationGroup() && parameters.IncludeVariationGroupProduct === true) ||
        (
            !product.isMaster() && !product.isVariationGroup() &&
            !product.isVariant() && parameters.IncludeSimpleProduct === true
        )
    ) {
        var defVariant;
        if (product.isMaster() || product.isVariationGroup()) {
            defVariant = product.getVariationModel().getDefaultVariant();
        }
        data = buildProductData(product, defVariant);
        writeNextCB(data);
    }

    // output child variation groups
    if (product.isMaster() && parameters.IncludeVariationGroupProduct === true) {
        writeChildProducts(product.getVariationModel().getVariationGroups(), product, writeNextCB);
    }

    // output child variants
    if ((product.isMaster() || product.isVariationGroup()) && parameters.IncludeVariantProduct === true) {
        writeChildProducts(product.getVariationModel().getVariants(), product, writeNextCB);
    }
}

/**
 * @param {dw.util.Collection} childProducts
 * @param {dw.catalog.Product} parentProduct
 * @param {Function} writeNextCB
 */
function writeChildProducts(childProducts, parentProduct, writeNextCB) {
    var childProduct, data;
    for (var indexPosition = 0, itemsLen = childProducts.length; indexPosition < itemsLen; indexPosition++) {
        childProduct = childProducts[indexPosition];
        if (exportModel.isIncremental) {
            if (childProduct.lastModified < exportModel.lastExported) {
                continue;
            }
        }
        if (!childProduct.isOnline())
            continue;
        data = buildProductData(childProduct, parentProduct);
        writeNextCB(data);
    }
}

/**
 * @param {dw.catalog.Product|dw.catalog.Variant} product
 * @param {dw.catalog.Product} defaultProduct Product to use as fallback, such as for pricing
 * @returns {Array<String>}
 */
function buildProductData(product, defaultProduct) {
    var data = {
        Product: product,
        DefaultProduct: defaultProduct, // master, variation group, or default variant
        ProductLink: require('dw/web/URLUtils').abs('Product-Show', 'pid', product.ID).https(),
        ImageLink: imageLink,
        Images: images,
        StandardPrice: standardPrice
    };
    return exportModel.buildRow(data);
}

function write(lines, parameters, stepExecution) {
    var row;
    for (var i = 0; i < lines.length; i++) {
        row = lines.get(i);
        if (typeof(row) === 'function') {
            row(function writeRow(data){
                exportModel.writeRow(data);
            });
        } else {
            exportModel.writeRow(row);
        }
    }
}

function afterStep(success, parameters, stepExecution) {
    exportModel.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};