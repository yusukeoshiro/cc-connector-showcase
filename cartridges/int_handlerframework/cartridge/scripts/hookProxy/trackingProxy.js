'use strict';

/**
 * @type {dw.system.HookMgr}
 */
const HookMgr = require('dw/system/HookMgr');
/**
 * @type {dw.system.Logger}
 */
const Logger = require('dw/system/Logger');

/**
 * Hook proxy for app.tracking.trackNonCached
 * Executes hooks:
 * - app.tracking.getDataLayer
 * - app.tracking.preEvents
 * - app.tracking.event
 * - app.tracking.postEvents
 */
function trackNonCached() {
    var hookID = 'app.tracking.getDataLayer';
    var requestData = HookMgr.callHook(
        hookID,
        hookID.slice(hookID.lastIndexOf('.') + 1)
    );

    hookID = 'app.tracking.preEvents';
    if (HookMgr.hasHook(hookID)) {
        HookMgr.callHook(
            hookID,
            hookID.slice(hookID.lastIndexOf('.') + 1),
            requestData
        );
    } else {
        Logger.debug('no hook registered for {0}', hookID);
    }

    requestData.events.forEach(function(eventDetail){
        var eventName = eventDetail[0];
        var eventValue = eventDetail[1];

        hookID = 'app.tracking.event';
        if (HookMgr.hasHook(hookID)) {
            HookMgr.callHook(
                hookID,
                hookID.slice(hookID.lastIndexOf('.') + 1),
                eventName,
                eventValue,
                requestData
            );
        } else {
            Logger.debug('no hook registered for {0}', hookID);
        }
    });

    hookID = 'app.tracking.postEvents';
    if (HookMgr.hasHook(hookID)) {
        HookMgr.callHook(
            hookID,
            hookID.slice(hookID.lastIndexOf('.') + 1),
            requestData
        );
    } else {
        Logger.debug('no hook registered for {0}', hookID);
    }
}

exports.trackNonCached = trackNonCached;