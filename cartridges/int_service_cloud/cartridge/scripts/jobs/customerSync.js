'use strict';

/**
 * @module jobs/customerSync
 */

/**
 * @type {dw.customer.CustomerMgr}
 */
const CustomerMgr = require('dw/customer/CustomerMgr');

/**
 * @type {module:models/contact.Contact}
 */
const ContactModel = require('../models/contact');
/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');

/**
 * @type {dw.util.SeekableIterator}
 */
var profilesIterator;
/**
 * @type {dw.svc.HTTPClient}
 */
var svc;

function beforeStep() {
    profilesIterator = CustomerMgr.searchProfiles('custom.sscSyncStatus != {0}', 'lastModified asc', 'exported');
    svc = ServiceMgr.restCreate();
}

function getTotalCount() {
    return profilesIterator.getCount();
}

function read() {
    if (profilesIterator.hasNext()) {
        return profilesIterator.next();
    }
}

function process(profile) {
    return profile;
}

function write(lines) {
    [].forEach.call(lines, function (profile) {
        var sccContactModel = new ContactModel(null, profile);
        var result = svc.call(ServiceMgr.restEndpoints.create.account, sccContactModel);
        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                sccContactModel.updateStatus('exported');
                sccContactModel.updateExternalId(result.object.responseObj.recordId);
                sccContactModel.updateSyncResponseText('Successfully Exported');
            } else {
                sccContactModel.updateSyncResponseText(result.object.errorText);
            }
        } else {
            sccContactModel.updateSyncResponseText(result.msg);
        }
    });
}

function afterStep() {
    profilesIterator.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
