'use strict';

/**
* Module for ordering functionality.
* @module models/OrderModel
*/

/* API Includes */

const Site = require('dw/system/Site'),
      AbstractModel = require('*/cartridge/scripts/models/AbstractModel'),
      Order = require('dw/order/Order'),
      OrderMgr = require('dw/order/OrderMgr'),
      Resource = require('dw/web/Resource'),
      Status = require('dw/system/Status'),
      Transaction = require('dw/system/Transaction'),
      HookMgr = require('dw/system/HookMgr');

/**
 * Place an order using OrderMgr. If order is placed successfully,
 * its status will be set as confirmed, and export status set to ready.
 * @param {dw.order.Order} order
 */
function placeOrder(order) {
    var placeOrderStatus = OrderMgr.placeOrder(order);
    if (placeOrderStatus === Status.ERROR) {
        OrderMgr.failOrder(order);
        throw new Error('Failed to place order.');
    }
    order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
    order.setExportStatus(Order.EXPORT_STATUS_READY);
}
/**
 * Order helper class providing enhanced order functionality.
 * @class module:models/OrderModel~OrderModel
 * @extends module:models/AbstractModel
 *
 * @param {dw.order.Order} obj The order object to enhance/wrap.
 */
var OrderModel = AbstractModel.extend({

});

/**
 * Gets a new instance for a given order or order number.
 *
 * @alias module:models/OrderModel~OrderModel/get
 * @param parameter {dw.order.Order | String} The order object to enhance/wrap or the order ID of the order object.
 * @returns {module:models/OrderModel~OrderModel}
 */
OrderModel.get = function (parameter) {
    var obj = null;
    if (typeof parameter === 'string') {
        obj = OrderMgr.getOrder(parameter);
    } else if (typeof parameter === 'object') {
        obj = parameter;
    }
    return new OrderModel(obj);
};

/**
 * Submits an order
 * @param order {dw.order.Order} The order object to be submitted.
 * @transactional
 * @return {Object} object If order cannot be placed, object.error is set to true. Ortherwise, object.order_created is true, and object.Order is set to the order.
 */
OrderModel.submit = function (order) {
    var Email = require('./EmailModel');
    var GiftCertificate = require('*/cartridge/scripts/models/GiftCertificateModel');
    try {
        Transaction.begin();
        placeOrder(order);

        // Creates gift certificates for all gift certificate line items in the order
        // and sends an email to the gift certificate receiver

        order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
            return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
        }).forEach(GiftCertificate.sendGiftCertificateEmail);

        Transaction.commit();
    } catch (e) {
        Transaction.rollback();
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical')
        };
    }

    Email.sendMail({
        template: 'mail/orderconfirmation',
        recipient: order.getCustomerEmail(),
        subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
        context: {
            Order: order
        }
    });

    if (session.forms.billing.billingAddress.addToEmailList.checked) {
        var hookID = 'app.mailingList.subscribe';
        if (HookMgr.hasHook(hookID)) {
            HookMgr.callHook(
                hookID,
                'subscribe',
                {
                    email: order.getCustomerEmail(),
                    Order: order
                }
            );
        }
    }

    /**
     * @type {dw.system.HookMgr}
     */
    var hookID = 'app.order.created';
    if (HookMgr.hasHook(hookID)) {
        HookMgr.callHook(
            hookID,
            hookID.slice(hookID.lastIndexOf('.') + 1),
            order
        );
    } else {
        require('dw/system/Logger').debug('no hook registered for {0}', hookID);
    }


    return {
        Order: order,
        order_created: true
    };
}

/** The order class */
module.exports = OrderModel;
