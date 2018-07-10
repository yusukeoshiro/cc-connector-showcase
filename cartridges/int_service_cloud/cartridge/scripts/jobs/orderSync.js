'use strict';

/**
 * @module jobs/orderSync
 */

/**
 * @type {dw.order.OrderMgr}
 */
const OrderMgr = require('dw/order/OrderMgr');

/**
 * @type {module:models/contact.Order}
 */
const OrderModel = require('../models/order');
/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');

/**
 * @type {dw.util.SeekableIterator}
 */
var orderIterator;
/**
 * @type {dw.svc.HTTPClient}
 */
var svc;

function beforeStep() {
    orderIterator = OrderMgr.searchOrders('custom.sscSyncStatus != {0}', 'lastModified asc', 'exported');
    svc = ServiceMgr.restCreate();
}

function getTotalCount() {
    return orderIterator.getCount();
}

function read() {
    if (orderIterator.hasNext()) {
        return orderIterator.next();
    }
}

/**
 * @param {dw.order.Order} order
 *
 * @returns {void|dw.order.Order}
 */
function process(order) {
    return order;
}

function write(lines) {
    [].forEach.call(lines, function (order) {
        var sccOrderModel = new OrderModel(order);
        var result = svc.call(ServiceMgr.restEndpoints.create.order, sccOrderModel);
        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                sccOrderModel.updateStatus('exported');
                sccOrderModel.updateExternalId(result.object.responseObj.recordId);
                sccOrderModel.updateSyncResponseText('Successfully Exported');
            } else {
                sccOrderModel.updateSyncResponseText(result.object.errorText);
            }
        } else {
            sccOrderModel.updateSyncResponseText(result.msg);
        }
    });
}

function afterStep() {
    orderIterator.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
