'use strict';

/**
 * @module controllers/MCSubscription
 */

// TODO: Content asset account-nav-unregistered and account-nav-registered should be updated to add endpoints to nav

const curSite = require('dw/system/Site').current;
const ArrayList = require('dw/util/ArrayList');
const HookMgr = require('dw/system/HookMgr');

/* Script Modules */
var app = require('*/cartridge/scripts/app');
var guard = require('*/cartridge/scripts/guard');

function manage() {
    var subscriber = require('int_marketing_cloud').subscriber(customer);
    var subscribedLists = subscriber.currentSubscriptions;
    var whitelist = (new ArrayList(curSite.getCustomPreferenceValue('mcMailingListsWhitelist'))).toArray();
    var availableLists = subscriber.fetchAvailableLists().filter(function(list){
        return whitelist.length <= 0 || whitelist.indexOf(list.ID) !== -1;
    });

    app.getForm('mcpreferences').clear();
    app.getForm('mcpreferences.lists').copyFrom(new (require('dw/util/ArrayList'))(availableLists));
    app.getView({
        ContinueURL: require('dw/web/URLUtils').https('MCSubscription-SavePreferences'),
        subscribedLists: subscribedLists,
        availableLists: availableLists
    }).render('marketingcloud/preferences');
}

function savePreferences() {
    var subscriptionForm = app.getForm('mcpreferences');

    var subscriptionResult = subscriptionForm.handleAction({
        save: function (formgroup) {
            var subscriber = require('int_marketing_cloud').subscriber(customer);
            for each (var list in formgroup.lists) {
                if (list.enabled.checked) {
                    subscriber.assignLists(list.listID.value);
                } else {
                    subscriber.unassignLists(list.listID.value);
                }
            }
            return subscriber.commit();
        },
        error: function (formgroup) {
            return null;
        }
    });

    response.redirect(require('dw/web/URLUtils').https('MCSubscription-Manage'));
}

function showSubscribe() {
    var form = app.getForm('mcsubscribe');
    if (form.object.isValid()) {
        // we're not clearing if invalid, so errors can be reflected to the user.
        app.getForm('mcsubscribe').clear();
    }
    app.getView({
        ContinueURL: require('dw/web/URLUtils').https('MCSubscription-Submit'),
        formAction: 'subscribe'
    }).render('marketingcloud/subscribe');
}

function showSubscribeFooter() {
    var form = app.getForm('mcsubscribe');
    if (form.object.isValid()) {
        // we're not clearing if invalid, so errors can be reflected to the user.
        app.getForm('mcsubscribe').clear();
    }
    app.getView({
        nodecorator: true,
        ContinueURL: require('dw/web/URLUtils').https('MCSubscription-Submit'),
        formAction: 'subscribeFooter'
    }).render('marketingcloud/subscribe');
}

function showUnsubscribe() {
    var form = app.getForm('mcsubscribe');
    if (form.object.isValid()) {
        // we're not clearing if invalid, so errors can be reflected to the user.
        app.getForm('mcsubscribe').clear();
    }
    app.getView({
        ContinueURL: require('dw/web/URLUtils').https('MCSubscription-Submit'),
        formAction: 'unsubscribe'
    }).render('marketingcloud/subscribe');
}

/**
 * The form handler for the sub/unsub forms.
 */
function submit() {
    var subscriptionForm = app.getForm('mcsubscribe');
    var subscribed = false;
    var noDecorator = false;
    var submittedAction;

    var hookID;
    var subscriptionResult = subscriptionForm.handleAction({
        subscribe: function (formgroup) {
            subscribed = true;

            hookID = 'app.mailingList.subscribe';
            if (HookMgr.hasHook(hookID)) {
                return HookMgr.callHook(
                    hookID,
                    hookID.slice(hookID.lastIndexOf('.') + 1),
                    {
                        email: formgroup.email.value
                    }
                );
            }
        },
        subscribeFooter: function (formgroup) {
            subscribed = true;
            //noDecorator = true;

            hookID = 'app.mailingList.subscribe';
            if (HookMgr.hasHook(hookID)) {
                return HookMgr.callHook(
                    hookID,
                    hookID.slice(hookID.lastIndexOf('.') + 1),
                    {
                        email: formgroup.email.value
                    }
                );
            }
        },
        unsubscribe: function (formgroup) {
            hookID = 'app.mailingList.unsubscribe';
            if (HookMgr.hasHook(hookID)) {
                return HookMgr.callHook(
                    hookID,
                    hookID.slice(hookID.lastIndexOf('.') + 1),
                    {
                        email: formgroup.email.value
                    }
                );
            }
        },
        error: function (formgroup) {
            submittedAction = formgroup.submittedAction.htmlName;
            return null;
        }
    });

    if (subscriptionResult === true) {
        app.getView({
            nodecorator: noDecorator,
            formSubmitted: true,
            subscribed: subscribed
        }).render('marketingcloud/subscribe');
        return;
    }

    switch(submittedAction.split('_').pop()) {
        case 'subscribe':
            showSubscribe();
            break;
        case 'subscribeFooter':
            showSubscribeFooter();
            break;
        case 'unsubscribe':
            showUnsubscribe();
            break;
    }
}

/* Web exposed methods */

/** Renders the case overview.
 * @see {@link module:controllers/MCSubscription~manage} */
exports.Manage = guard.ensure(['https', 'loggedIn'], manage);
/** @see {@link module:controllers/MCSubscription~savePreferences} */
exports.SavePreferences = guard.ensure(['post', 'https', 'loggedIn'], savePreferences);
/** @see {@link module:controllers/MCSubscription~showSubscribe} */
exports.Subscribe = guard.ensure(['https'], showSubscribe);
/** @see {@link module:controllers/MCSubscription~showSubscribeFooter} */
exports.SubscribeFooter = guard.ensure(['https'], showSubscribeFooter);
/** @see {@link module:controllers/MCSubscription~showUnsubscribe} */
exports.Unsubscribe = guard.ensure(['https'], showUnsubscribe);
/** @see {@link module:controllers/MCSubscription~submit} */
exports.Submit = guard.ensure(['post', 'https'], submit);
