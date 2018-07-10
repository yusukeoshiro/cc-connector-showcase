'use strict';

/**
 * @module models/order
 */

/**
 * @type {dw.system.Transaction}
 */
const Transaction = require('dw/system/Transaction');

/**
 * Order class
 * @param {dw.order.Order} [order] Order object
 * @constructor
 * @alias module:models/order~Order
 */
function Order(order) {
    if (empty(order)) {
        throw new Error('order object is empty. Order requires an order object to continue.');
    }

    /**
     * @type {string} The object type represented in Service Cloud
     */
    this.type = 'Order';

    /**
     * @type {dw.order.Order}
     */
    this.order = order;

    /**
     * @type {dw.customer.Profile}
     */
    this.profile = {};
    if (!empty(order.getCustomer()) && !empty(order.getCustomer().getProfile())) {
        this.profile = order.getCustomer().getProfile();
    }
}

/**
 * @alias module:models/order~Order#prototype
 */
Order.prototype = {
    /**
     * Builds up a formatted object for JSON.stringify()
     * @returns {Object}
     */
    toJSON: function () {
        var toJSON = {
            order_no: this.order.getOrderNo(),
            status: 'Draft',
            order_total: this.order.getTotalGrossPrice().getValue(),
            scc_sync_status: 'Created'
        };

        if (this.order.getCustomer().isAuthenticated() && !empty(this.profile)) {
            toJSON.crmcontact_id = this.profile.custom.sscid;
        }

        return toJSON;
    },

    /**
     * Update the {custom.sscSyncStatus} attribute with the given {status}
     *
     * @param {String} status
     */
    updateStatus: function (status) {
        var order = this.order;

        Transaction.wrap(function () {
            order.custom.sscSyncStatus = status;
        });
    },

    /**
     * Update the {custom.sscid} attribute with the given {id}
     */
    updateExternalId: function (id) {
        var order = this.order;

        Transaction.wrap(function () {
            order.custom.sscid = id;
        });
    },

    /**
     * Update the {custom.sscSyncResponseText} attribute with the given {text}
     *
     * @param {String} text
     */
    updateSyncResponseText: function (text) {
        var order = this.order;

        Transaction.wrap(function () {
            var sscSyncResponseText = order.custom.sscSyncResponseText.slice(0);
            sscSyncResponseText.push(text);
            order.custom.sscSyncResponseText = sscSyncResponseText;
        });
    }
};

module.exports = Order;
