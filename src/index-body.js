//
// === TO DO — 3rd-party includes ===
//

// tempus dominus
//import 'tempusdominus-bootstrap-4';

// moment.js with Timezone supprt
//import moment from 'moment-timezone';

//URI.js
import URI from 'urijs';

// mustache templates
import Mustache from 'mustache';

// js-cookie
import Cookies from 'js-cookie';

// is.js micro type checker
import is from 'is_js';

// human joiner
import hjn from '@bartificer/human-join';

//
// === Global Variables ===
//

// cookie settings
var COOKIE_TTL = 365; // one year

// template strings
var TEMPLATES = {
    problemAlert: '', // the templte for warning and error alerts
    sharedIntro: '', // the template for the introduction above the shared time
    clock: '' // the template for rendering a clock
};

// the date & time formats
var DATE_FORMAT = 'L';
var TIME_FORMAT = 'HH:mm';
var COMBINED_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`;

// jQuery preferences
var JQ_ANI_TIME = 250; // the number of milliseconds to use for jQuery animations

// jQuery objects representing important UI elements
var $PROBLEM_ALERTS = null; // the container for any problem alerts
var $YOU_FM = null; // the 'you' form
var $YOU_TIMEZONE_TB = null; // the text box for your timezone
var $YOU_NAME_TB = null; // the text box for your name
var $YOU_SAVE_BTN = null; // the button to show/hide the save controls
var $YOU_SAVE_DIV = null; // the container for the save controls
var $YOU_LINK_TB = null; // the text box for your personal link
var $YOU_LINK_BTN = null; // the button for generating your personal link
var $YOU_COOKIE_SAVE_BTN = null; // the button for saving a cookie
var $YOU_COOKIE_DELETE_FG = null; // the form group for the cookie deletion UI
var $YOU_COOKIE_DELETE_BTN = null; // the button for deleting a cookie
var $YOU_COOKIE_DESC = null; // the description of the currently set cookie
var $SHARED_TAB_LI = null; // the nav item containing the button for the shared tab pane
var $SHARED_INTRO_DIV = null; // the paragraph with the shared time introdiction
var $SHARED_YOURTIME_TIME = null; // the placeholder for the shared time in the recipient's timezone
var $SHARED_YOURTIME_TIMEZONE = null; // the placeholder for the recipient's timezone
var $SHARED_THEIRTIME_NAME = null; // the placeholder for the label for the sender's time
var $SHARED_THEIRTIME_TIME = null; // the placeholder for the shared time in the sender's timezone
var $SHARED_THEIRTIME_TIMEZONE = null; // the placeholder for the sender's timezone
var $SHARE_FM = null; // the share form
var $SHARE_DATE_DP = null; // the date picker for the sharing date
var $SHARE_DATE_TB = null; // the text box for the sharing date
var $SHARE_TIME_DP = null; // the time picker for the sharing date
var $SHARE_TIME_TB = null; // the text box for the sharing time
var $SHARE_BTN = null; // the button for generating the share link
var $SHARE_TB = null; // the text box for holding the share link
var $ALL_FM = null; // the 'you' and share forms

// the infomration passed in the URL (if any)
var URL_DATA = { timeShared: false };

// the information saved in cookies (if any)
var COOKIE_DATA = {};

//
// === Utility Functions ===
//

/**
 * Test if a given value is a valid unix timestamp.
 *
 * @param val
 * @return {boolean}
 */
function isUTS(val){
    // if it's not all digits it's defnitely not a UTS
    if(!String(val).match(/^\d+$/)) return false;
    
    // make sure the value is within range
    if(parseInt(val) > 2147483647) return false;
    
    // if we got here all is well
    return true;
}

/**
 * Test if a given value is a valid IANA timezone.
 *
 * @param {string} val
 * @return {boolean}
 */
function isIANATimezone(val){
    // make sure it's a string
    if(is.not.string(val)) return false;
    
    // make sure the zone exists
    if(is.null(moment.tz.zone(val))) return false;
    
    // if we got here all is well
    return true;
}

/**
 * Convert an IANA timezone name to a human-friendly timezone name.
 *
 * This function simply replaces underscores with spaces.
 *
 * @param {string} ianaTZName
 * @return {string}
 */
function ianaTZToHuman(ianaTZName){
    return String(ianaTZName).replaceAll('_', ' ');
}

/**
 * Convert a human-friendly timezon name to an IANA timezone name.
 *
 * This function simply replaces spaces with underscores.
 *
 * @param {string} humanTZName
 * @return {string}
 */
function humanTZToIANA(humanTZName){
    return String(humanTZName).replaceAll(' ', '_');
}

/**
 * Sanitise a name.
 *
 * This function collapses all white space into single spaces, and trims the string.
 *
 * @param {string} name
 * @return {string}
 */
function sanitiseName(name){
    return String(name).replace(/\s+/g, ' ').trim();
}

//
// === UI Functions ===
//

/**
 * Log a warning or error message.
 *
 * Shows a dismissable alert and logs to the console.
 *
 * @param {string} message
 * @param {boolean} [isError=false]
 * @param {Error|string} [error] - Detailed error information that will be logged to the console but not alerted to the user.
 */
function logProblem(message, isError, error){
    // build the title
    const title = isError ? 'Error' : 'Warning';
    
    // log the error
    if(isError){
        console.error(`${title}: ${message}`, error);
    }else{
        console.warn(`${title}: ${message}`, error);
    }
    
    // build and init an alert
    const $alert = $(Mustache.render(
        TEMPLATES.problemAlert,
        {
            bootstrapColor: isError ? 'danger' : 'warning',
            title,
            message
        }
    )).alert();
    
    // inject the alert into the document
    $PROBLEM_ALERTS.append($alert);
}

/**
 * Read my timezone in human-friendly form.
 *
 * @return {string} Ahuman-friendly timezone name, e.g. `'America/Los Angeles'`.
 */
function myTimezone(){
    return $YOU_TIMEZONE_TB.val();
}

/**
 * Read my timezone as an IANA timezone name.
 *
 * @return {string} An IANA timezone name, e.g. `'America/Los_Angeles'`.
 */
function myIANATimezone(){
    return humanTZToIANA(myTimezone());
}

/**
 * Read my name from the form.
 *
 * This function sanitises the name.
 *
 * @return {string}
 */
function myName(){
    return sanitiseName($YOU_NAME_TB.val());
}

/**
 * Render a clock given a time as a moment object.
 *
 * @param {moment} time
 * @param {boolean} [primarClock=false]
 * @return {jQuery}
 */
function renderClock(time, primaryClock){
    return $(Mustache.render(
        TEMPLATES.clock,
        {
            time: time.format(TIME_FORMAT),
            date: time.format(DATE_FORMAT),
            bootstrapColor: primaryClock ? 'primary' : 'secondary'
        }
    ));
}

/**
 * Update the display of the cookie information.
 */
function updateCookieDisplay(){
    // get the currently set cookies
    const cookieStrings = [];
    const mytz = Cookies.get('mytz');
    if(mytz){
        cookieStrings.push(`your timezone as <kbd>${ianaTZToHuman(mytz)}</kbd>`);
    }
    const myname = Cookies.get('myname');
    if(myname){
        cookieStrings.push(`your name as <kbd>${myname}</kbd>`);
    }
    
    // show or hide as appropriate
    if(cookieStrings.length > 0){
        // there are cookies, so show them
        
        // write the cookie description
        $YOU_COOKIE_DESC.html(`Your cookie currently stores ${hjn.and.j(cookieStrings)}`);
        
        // show the form group
        $YOU_COOKIE_DELETE_FG.removeClass('d-none').show(JQ_ANI_TIME);
    }else{
        // there are not cookies, so hide the section
        $YOU_COOKIE_DELETE_FG.hide(JQ_ANI_TIME);
    }
}

/**
 * Update the display of the shared time.
 */
function updateSharedTime(){
    // make sure there is a shared time before doing anything!
    if(!URL_DATA.timeShared){
        console.debug('atempt to update the shared time when no time was shared - ignoring');
        return;
    }
    
    // build a moment object representing the shared time
    const sharedTime = moment.tz(URL_DATA.uts, 'X', myIANATimezone());
    
    // render the time in your timezone
    $SHARED_YOURTIME_TIME.empty().append(renderClock(sharedTime, true));
    $SHARED_YOURTIME_TIMEZONE.text(myTimezone());
    
    // render the time in the sender's timezone
    const theirTime = moment(sharedTime).tz(URL_DATA.tz);
    let theirName = 'Their';
    if(URL_DATA.name){
        theirName = `${URL_DATA.name}'${ URL_DATA.name.match(/s$/i) ? '' : 's' }`;
    }
    $SHARED_THEIRTIME_NAME.text(theirName);
    $SHARED_THEIRTIME_TIME.empty().append(renderClock(theirTime));
    $SHARED_THEIRTIME_TIMEZONE.text(ianaTZToHuman(URL_DATA.tz));
}

/**
 * Generate a personal link.
 *
 * @return {string} The generated URL.
 */
function generatePersonalLink(){
    // validate the data
    const mytz = myIANATimezone();
    if(!isIANATimezone(mytz)){
        logProblem('Failed to generate personal link - invalid timezone', false, `invalid timezone: ${mytz}`);
        return '';
    }
    
    // build the URL
    const saveInfo = { mytz };
    const name = myName();
    if(name){
        saveInfo.myname = name;
    }
    const saveURL = URI().query(saveInfo);
    const personalURL = saveURL.toString();
        
    // write the URL to the textbox and select it
    $YOU_LINK_TB.val(personalURL).select();
    
    // return the URL
    return personalURL;
}

/**
 * Save my settings to cookies.
 */
function saveCookies(){
    // validate the data
    const tz = myIANATimezone();
    if(!isIANATimezone(tz)){
        logProblem('Failed to save cookie, invalid timezone.', false, `invalid timezone: ${tz}`);
        return;
    }
    
    // write the cookies
    Cookies.set('mytz', tz, { expires: COOKIE_TTL });
    COOKIE_DATA.mytz = tz;
    const name = myName();
    if(name){
        Cookies.set('myname', name, { expires: COOKIE_TTL });
        COOKIE_DATA.myname = name;
    }else{
        Cookies.remove('myname');
        delete COOKIE_DATA.myname;
    }
    console.info('saved personal info to cookie:', COOKIE_DATA);
        
    // update the cookie display
    updateCookieDisplay();
}

/**
 * Delete my Cookies.
 */
function deleteCookies(){
    // delete the cookies
    Cookies.remove('mytz');
    delete COOKIE_DATA.mytz;
    Cookies.remove('myname');
    delete COOKIE_DATA.myname;
    console.info('deleted cookies');
        
    // update the cookie display
    updateCookieDisplay();
}

/**
 * Generate a share link.
 *
 * @return {string} The generated URL.
 */
function generateShareLink(){
    // validate the data
    const shareTZ = myIANATimezone();
    if(!isIANATimezone(shareTZ)){
        logProblem('Failed to generate share link - invalid timezone', false, `invalid timezone: ${shareTZ}`);
        return '';
    }
    
    // build an object representing the date time in the appropriate timezone
    const shareDate = moment.tz(`${$SHARE_DATE_TB.val()} ${$SHARE_TIME_TB.val()}`, COMBINED_FORMAT, shareTZ);
    if(!shareDate.isValid()){
        logProblem('Failed to generate shar link', false, 'moment constructor returned invalid date');
        return '';
    }
        
    // build the URL
    const shareInfo = {
        uts: shareDate.unix(),
        tz: shareTZ
    };
    const name = myName();
    if(name){
        shareInfo.name = name;
    }
    const shareURL = URI().query(shareInfo);
        
        
    // write the URL to the textbox and select it
    const shareURLString = shareURL.toString();
    $SHARE_TB.val(shareURLString).select();
    
    // return the URL
    return shareURLString;
}
//
// === The Document Ready Handler ===
//
$(function(){
    //
    // -- init the global jQuery variables --
    //
    $PROBLEM_ALERTS = $('#problem-alerts');
    $YOU_FM = $('#you-fm');
    $YOU_TIMEZONE_TB = $('#you-timezone-tb');
    $YOU_NAME_TB = $('#you-name-tb');
    $YOU_SAVE_BTN = $('#you-save-btn');
    $YOU_SAVE_DIV = $('#you-save-div');
    $YOU_LINK_TB = $('#you-link-tb');
    $YOU_LINK_BTN = $('#you-link-btn');
    $YOU_COOKIE_SAVE_BTN = $('#you-cookie-save-btn');
    $YOU_COOKIE_DELETE_FG = $('#you-cookie-delete-fg');
    $YOU_COOKIE_DELETE_BTN = $('#you-cookie-delete-btn');
    $YOU_COOKIE_DESC = $('#you-cookie-desc');
    $SHARED_TAB_LI = $('#shared-tab-li');
    $SHARED_INTRO_DIV = $('#shared-intro-div');
    $SHARED_YOURTIME_TIME = $('#shared-yourTime-time');
    $SHARED_YOURTIME_TIMEZONE = $('#shared-yourTime-timezone');
    $SHARED_THEIRTIME_NAME = $('#shared-theirTime-name');
    $SHARED_THEIRTIME_TIME = $('#shared-theirTime-time');
    $SHARED_THEIRTIME_TIMEZONE = $('#shared-theirTime-timezone');
    $SHARE_FM = $('#share-fm');
    $SHARE_DATE_DP = $('#share-date-dp');
    $SHARE_DATE_TB = $('#share-date-tb');
    $SHARE_TIME_DP = $('#share-time-dp');
    $SHARE_TIME_TB = $('#share-time-tb');
    $SHARE_BTN = $('#share-btn');
    $SHARE_TB = $('#share-tb');
    $ALL_FM = $().add($YOU_FM).add($SHARE_FM);
    
    //
    // -- load templates --
    //
    TEMPLATES.clock = $('#clock-tpl').html();
    TEMPLATES.sharedIntro = $('#shared-intro-tpl').html();
    TEMPLATES.problemAlert = $('#problem-alert-tpl').html();
    
    //
    // -- extract data from URL
    //
    const rawURLInfo = (new URI()).query(true);
    if(rawURLInfo.uts && rawURLInfo.tz){
        let allOK = true;
        if(!isUTS(rawURLInfo.uts)){
            console.warn('Invalid UTS in URL', rawURLInfo.uts);
            allOK = false;
        }
        if(!isIANATimezone(rawURLInfo.tz)){
            console.warn('Invalid Timezone in URL', rawURLInfo.tz);
            allOK = false;
        }
        if(allOK){
            URL_DATA.timeShared = true;
            URL_DATA.uts = rawURLInfo.uts;
            URL_DATA.tz = rawURLInfo.tz;
            if(rawURLInfo.name){
                URL_DATA.name = sanitiseName(rawURLInfo.name);
            }
        }else{
            logProblem('Ignored invalid data in URL', false);
        }
    }
    if(rawURLInfo.mytz){
        if(isIANATimezone(rawURLInfo.mytz)){
            URL_DATA.mytz = rawURLInfo.mytz;
        }else{
            logProblem('Ignored invalid saved timezone in URL', false, `Invalid TimeZone: ${rawURLInfo.mytz}`);
        }
    }
    if(rawURLInfo.myname){
        URL_DATA.myname = sanitiseName(rawURLInfo.myname);
    }
    
    //
    // -- extract data from Cookies (and refresh if found) --
    //
    const rawCookieInfo = Cookies.get();
    if(rawCookieInfo.myname){
        COOKIE_DATA.myname = sanitiseName(rawCookieInfo.myname);
    }
    if(rawCookieInfo.mytz){
        if(isIANATimezone(rawCookieInfo.mytz)){
            COOKIE_DATA.mytz = rawCookieInfo.mytz;
        }else{
            logProblem('Ignored invalid saved timezone in Cookie', false, `Invalid TimeZone: ${rawCookieInfo.mytz}`);
        }
    }
    updateCookieDisplay();
    
    //
    // -- Init the UI --
    //
    
    // build the set of timezones for use in the timezone dropdowns
    const tzAutoCompeleSource = {};
    let tzAutoCompleteCounter = 1;
    for(const tzName of moment.tz.names()){
        // break the timezone into parts
        const tzParts = tzName.split('\/');
        
        // skip timezones with more than two parts
        if(tzParts.length != 2) continue;
                
        // skip the artificial Etc region
        if(tzParts[0] === 'Etc') continue;
        
        // if we got here, add the timezone as an option
        tzAutoCompeleSource[ianaTZToHuman(tzName)] = tzAutoCompleteCounter;
        tzAutoCompleteCounter++;
    }
    
    // a local function for validating the pre-requisutes for saving a personal URL or cookie
    const validateSaving = function(){
        // get a list of all invalid inputs
        const $invalid = $('.is-invalid', $YOU_FM);
        
        if($invalid.length === 0){
            // no invalid fields
            $YOU_LINK_BTN.prop('disabled', false);
            $YOU_COOKIE_SAVE_BTN.prop('disabled', false);
        }else{
            // at least one invalid field
            $YOU_LINK_BTN.prop('disabled', true);
            $YOU_COOKIE_SAVE_BTN.prop('disabled', true);
        }
    };
    
    // a local function for validating the pre-requisutes for sharing
    const validateSharing = function(){
        // get a list of all invalid inputs
        const $invalid = $('.is-invalid', $ALL_FM);
        
        if($invalid.length === 0){
            // no invalid fields
            $SHARE_BTN.prop('disabled', false);
        }else{
            // at least one invalid field
            $SHARE_BTN.prop('disabled', true);
        }
    };
    
    // init the timezone input
    let defaultTz = 'UTC';
    if(URL_DATA.mytz){
        defaultTz = URL_DATA.mytz;
        console.info('using timezone from URL');
    }else if(COOKIE_DATA.mytz){
        defaultTz = COOKIE_DATA.mytz;
        console.info('using timezone from cookie');
    }else{
        defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.info('using timezone from browser locale');
    }
    $YOU_TIMEZONE_TB.val(defaultTz).autocomplete({
        source: tzAutoCompeleSource, // the autocompelte values
        maximumItems: 10, // the maximum autocomplete suggestions
        treshold: 1, // the minimum number of characters to search
        onSelectItem: function(){ // event handler for selection of autocomplete suggestion
            $YOU_TIMEZONE_TB.trigger('input');
        }
    }).on('input', function(){
        // validate the timezone
        if(isIANATimezone(myIANATimezone())){
            // mark the field as valid
            $YOU_TIMEZONE_TB.removeClass('is-invalid').addClass('is-valid');
            
            // update the shared time, if any
            if(URL_DATA.timeShared){ updateSharedTime(); }
        }else{
            // timezone is invalid
            $YOU_TIMEZONE_TB.removeClass('is-valid').addClass('is-invalid');
        }
        
        // re-validate sharing & saving
        validateSharing();
        validateSaving();
    });
    
    // init the name input
    if(URL_DATA.myname){
        $YOU_NAME_TB.val(URL_DATA.myname);
        console.info('using name from URL');
    }else if(COOKIE_DATA.myname){
        $YOU_NAME_TB.val(COOKIE_DATA.myname);
        console.info('using name from Cookie');
    }
    
    // add an event handler to blank the personal link when any of the personal data changes
    $('input', $YOU_FM).on('input', function(){
        $YOU_LINK_TB.val('');
    });
    
    // add handlers to update the label on the show/hide button for the save controls
    $YOU_SAVE_DIV.on('show.bs.collapse', function(){
        $YOU_SAVE_BTN.text('Hide Save Controls');
    });
    $YOU_SAVE_DIV.on('hide.bs.collapse', function(){
        $YOU_SAVE_BTN.text('Save as Defaults …');
    });
    
    // add a click handler to the personal link button
    $YOU_LINK_BTN.click(generatePersonalLink);
    
    // add a click handler to the cookie save button
    $YOU_COOKIE_SAVE_BTN.click(saveCookies);
    
    // add a click handler to the cookie delete button
    $YOU_COOKIE_DELETE_BTN.click(deleteCookies);
    
    // if there is a shared time, use it as the default for the pickers
    let localSharedTime = null;
    if(URL_DATA.timeShared){
        localSharedTime = moment.tz(URL_DATA.uts, 'X', $YOU_TIMEZONE_TB.val());
        console.info('initialising date & time pickers from shared time');
    }
    
    // init the date picker
    const startOfDay = moment().startOf('day');
    $('#share-date-example').text(startOfDay.format(DATE_FORMAT));
    $SHARE_DATE_DP.datetimepicker({
        format: DATE_FORMAT,
        minDate: startOfDay,
        defaultDate: localSharedTime ? localSharedTime : moment()
    });
    $SHARE_DATE_TB.on('input', function(){
        // validate the date
        const dObj = moment($SHARE_DATE_TB.val(), DATE_FORMAT, true);
        if(dObj && dObj.isValid()){
            // the date is valid, so mark it as such
            $SHARE_DATE_TB.removeClass('is-invalid').addClass('is-valid');
        }else{
            // the date is invalid
            $SHARE_DATE_TB.removeClass('is-valid').addClass('is-invalid');
        }
        
        // revalidate sharing
        validateSharing();
    });
    
    // init the time picker
    $SHARE_TIME_DP.datetimepicker({
        format: TIME_FORMAT,
        defaultDate: localSharedTime ? localSharedTime : moment().startOf('hour').add(1, 'hour'),
        stepping: 15
    });
    $SHARE_TIME_TB.on('input', function(){
        // validate the time
        const tObj = moment($SHARE_TIME_TB.val(), TIME_FORMAT, true);
        if(tObj && tObj.isValid()){
            // the time is valid, so mark it as such
            $SHARE_TIME_TB.removeClass('is-invalid').addClass('is-valid');
        }else{
            // the date is invalid
            $SHARE_TIME_TB.removeClass('is-valid').addClass('is-invalid');
        }
        
        // revalidate sharing
        validateSharing();
    });
    
    // add an event handler to blank the share link when any of the relevant data changes
    $('input', $ALL_FM).on('input', function(){
        $SHARE_TB.val('');
    });
    
    // add a click handler to the generate button
    $SHARE_BTN.click(generateShareLink);
    
    //
    // -- Load The Shared Time (if any) --
    //

    if(URL_DATA.timeShared){
        // render the introduction to the shared time
        $SHARED_INTRO_DIV.empty().html(Mustache.render(
            TEMPLATES.sharedIntro,
            { name: URL_DATA.name ? URL_DATA.name : 'Someone' }
        ));
        
        // render the shared time
        updateSharedTime();
        
        // show the tab for the shared time
        $SHARED_TAB_LI.removeClass('d-none');
        
        // activate the tab for the shared time
        $('a', $SHARED_TAB_LI).click();
    }
});