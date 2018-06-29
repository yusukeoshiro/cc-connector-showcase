'use strict';

/**
 * Generic object to hold information for the life of the request
 * @type {Object}
 */
var requestDataLayer = {};
/**
 * Whether init has already occurred
 * @type {boolean}
 */
var initExecuted = false;
/**
 * Whether the base data layer has been built out
 * @type {boolean}
 */
var dataLayerExpanded = false;
/**
 * RegEx used to identify system-generated requests that can be ignored
 * @type {RegExp}
 */
var systemRegEx = /__Analytics|__SYSTEM__/;

/**
 * Returns true if system request (Analytics, SYSTEM, etc)
 * @returns {boolean}
 */
function isSystemRequest() {
    return request.httpRequest
        && systemRegEx.test(request.httpURL.toString());
}

/**
 * Returns true if script executing in Business Manager context (Sites-Site)
 * @returns {boolean}
 */
function isBM() {
    // if Sites-Site, we're in Business Manager
    return require('dw/system/Site').current.ID === 'Sites-Site';
}

/**
 * Returns whether basket has updated since request start
 * @returns {boolean}
 */
function hasBasketUpdated() {
    // ensure init has executed
    init();

    var currentBasket = require('dw/order/BasketMgr').currentBasket;
    return (currentBasket && requestDataLayer && requestDataLayer.origBasketState !== currentBasket.etag) || false;
}

/**
 * This init method runs onRequest, so it needs to remain light.
 * The onRequest hook doesn't execute for server includes, so init() is also executed by getDataLayer() (if not already executed)
 * No value returned, to ensure other onRequest hooks are executed.
 *
 * Limited usage of session.custom for sharing data across separate threads within same request
 */
function init() {
    // Only run true init when executed by ONREQUEST thread (real start of request)
    if (!initExecuted && !isBM() && !isSystemRequest()) {
        if (request.httpHeaders.get('x-is-notify') === 'ONREQUEST') {
            // We need to track basket ID, so we can know if it has changed since request start
            var currentBasket = require('dw/order/BasketMgr').currentBasket;
            var origBasketState = '';
            if (currentBasket) {
                origBasketState = currentBasket.etag;
            }
            requestDataLayer.origBasketState = origBasketState;
            session.custom.origBasketState = origBasketState;
        } else {
            requestDataLayer.origBasketState = session.custom.origBasketState;
        }
    }
    initExecuted = true;
}

/**
 * Expands on data layer. This is not executed in init(), to keep onRequest light.
 */
function expandDataLayer() {
    if (!dataLayerExpanded) {
        requestDataLayer.request = buildCurrentRequest();
        requestDataLayer.events = buildEvents();
        //dw.system.Logger.debug('request data layer: \n{0}', JSON.stringify(requestDataLayer, null, 2));
    }
    dataLayerExpanded = true;
}

/**
 * Builds an array of events. Each event is an array, where first value is the event, following values are pertinent args
 * @returns {Array}
 */
function buildEvents() {
    const format = require('dw/util/StringUtils').format;
    var params = request.httpParameterMap;
    var paramMap = params.getParameterMap('param_');

    var controller = requestDataLayer.request.detectedController.controller || '';
    var method = requestDataLayer.request.detectedController.method || '';
    var controllerAndMethod = format('{0}-{1}', controller, method).toLowerCase();
    var pipeline = (requestDataLayer.request.clickstreamPipeline || '').toLowerCase();

    function isEndpoint(endpointArray) {
        return (endpointArray.indexOf(controllerAndMethod) !== -1) || (endpointArray.indexOf(pipeline) !== -1);
    }

    var triggeredForm = requestDataLayer.request.triggeredForm;
    var events = [];
    if (isEndpoint(['search-show'])) {
        if (paramMap.isParameterSubmitted('q')) {
            events.push(['search', paramMap.get('q').stringValue]);
        }
        if (paramMap.isParameterSubmitted('cgid')) {
            events.push(['category', paramMap.get('cgid').stringValue]);
        }
    }
    if (isEndpoint(['page-show'])) {
        if (paramMap.isParameterSubmitted('cid')) {
            events.push(['content', paramMap.get('cid').stringValue]);
        }
    }
    if (isEndpoint(['product-show', 'product-showincategory'])) {
        if (paramMap.isParameterSubmitted('pid')) {
            events.push(['product', paramMap.get('pid').stringValue]);
        }
    }
    if (isEndpoint(['cart-addproduct'])) {
        if (paramMap.isParameterSubmitted('pid')) {
            events.push(['cartAddProduct', paramMap.get('pid').stringValue]);
        }
    }
    if (isEndpoint(['cart-show'])) {
        events.push(['viewCart']);
    }
    if (isEndpoint(['cart-submitform'])) {
        if (triggeredForm) {
            if (triggeredForm.formID === 'cart' && triggeredForm.actionID === 'addCoupon') {
                try {
                    var coupon = session.forms.cart.couponCode.htmlValue;
                    if (coupon) {
                        events.push(['cartAddCoupon', coupon]);
                    }
                }catch (e) {
                    // log error?
                }
            }
        }
    }
    if (isEndpoint(['wishlist-add'])) {
        if (paramMap.isParameterSubmitted('pid')) {
            events.push(['wishlistAddProduct', paramMap.get('pid').stringValue]);
        }
    }
    if (isEndpoint(['giftregistry-addproduct'])) {
        if (paramMap.isParameterSubmitted('pid')) {
            events.push(['registryAddProduct', paramMap.get('pid').stringValue]);
        }
    }
    if (isEndpoint(['cocustomer-start'])) {
        events.push(['checkout', 'step0']);
    }
    if (isEndpoint(['coshipping-start'])) {
        events.push(['checkout', 'step1']);
    }
    if (isEndpoint(['coshipping-singleshipping'])) {
        if (triggeredForm && triggeredForm.formID) {
            if (triggeredForm.formID === 'singleshipping' && triggeredForm.actionID === 'save') {
                events.push(['coShipping', 'submitted']);
            }
        }
    }
    if (isEndpoint(['cobilling-start', 'cobilling-publicstart'])) {
        events.push(['checkout', 'step2']);
    }
    if (isEndpoint(['cobilling-billing'])) {
        if (triggeredForm && triggeredForm.formID) {
            if (triggeredForm.formID === 'billing' && triggeredForm.actionID === 'save') {
                events.push(['coBilling', 'submitted']);
                try {
                    if (session.forms.billing.billingAddress.addToEmailList.isChecked() === true) {
                        var email = session.forms.billing.billingAddress.email.emailAddress.htmlValue;
                        events.push(['mailingListSubscribed', email]);
                    }
                }catch (e) {
                    // log error?
                }
            }
        }
    }
    if (isEndpoint(['cosummary-start'])) {
        events.push(['checkout', 'step3']);
    }
    if (isEndpoint(['cosummary-submit'])) {
        events.push(['coSummary', 'submitted']);
        if (params.isParameterSubmitted('orderNo')) {
            var orderID = params.get('orderNo').stringValue;
            events.push(['orderConfirmation', orderID]);
        }
    }

    if (hasBasketUpdated()) {
        events.push(['basketUpdated']);
    }

    if (requestDataLayer.request.isAjaxRequest) {
        events.push(['ajaxRequest']);
    }

    return events;
}

/**
 * Builds out a custom request object definition, considering whether there was a proxied request
 * @returns {Object}
 */
function buildCurrentRequest() {
    var lastClick = session.clickStream.last || {};
    var params = request.httpParameterMap;
    var paramMap = params.getParameterMap('param_');
    return {
        requestID: request.requestID.replace(/-\d+-\d+$/, ''),
        referer: lastClick.referer,
        urlPath: lastClick.path,
        queryString: lastClick.queryString,
        triggeredForm: !empty(request.triggeredForm) || params.isParameterSubmitted('formID') ? buildTriggeredForm() : {},
        params: buildParams(paramMap),
        clickstreamPipeline: lastClick.pipelineName,
        detectedController: {
            controller: params.isParameterSubmitted('currentController') ? params.get('currentController').stringValue : '',
            method: params.isParameterSubmitted('currentControllerMethod') ? params.get('currentControllerMethod').stringValue : ''
        },
        isAjaxRequest: params.isParameterSubmitted('isAjax') && params.get('isAjax').getBooleanValue(false)
    };
}

/**
 * Returns triggered form/action IDs from the proxied request
 * @returns {{formID: string, actionID: string}}
 */
function buildTriggeredForm() {
    var params = request.httpParameterMap;
    return {
        formID: params.isParameterSubmitted('formID') ? params.get('formID').stringValue : request.triggeredForm.formId,
        actionID: params.isParameterSubmitted('formActionID') ? params.get('formActionID').stringValue : request.triggeredFormAction.formId
    }
}

/**
 * Converts a parameter map to a plain object
 * @param {dw.web.HttpParameterMap} parameterMap
 * @returns {Object}
 */
function buildParams(parameterMap) {
    var params = {};
    parameterMap.parameterNames.toArray().forEach(function(param){
        if (parameterMap.get(param).values.length > 1) {
            params[param] = parameterMap.get(param).values.toArray();
        } else {
            params[param] = parameterMap.get(param).value;
        }
    });
    return params;
}

/**
 * Returns the current data layer object, false if not defined.
 * @returns {Object|boolean}
 */
function getDataLayer() {
    init();
    if (!dataLayerExpanded) {
        expandDataLayer();
    }
    return requestDataLayer || false;
}

exports.onRequest = init;
exports.getDataLayer = getDataLayer;
exports.hasBasketUpdated = hasBasketUpdated;
