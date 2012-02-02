(function () {

  var parts = {}

  var contacts = [];

  var action = {};

  var LEEWAY = 3;

  function init() {
    parts.reader = document.getElementById('reader');
    parts.cmpts = [
      document.getElementById('cmpt1'),
      document.getElementById('cmpt2')
    ];
    parts.status = document.getElementById('status');
    Monocle.Browser.survey(initListeners);
  }


  function initListeners() {
    Monocle.Events.listenForContact(
      parts.reader,
      { 'start': translatorFunction(parts.reader, readerContactStart) }
    );
    Monocle.Events.listenForContact(
      parts.cmpts[0].contentDocument.defaultView,
      { 'start': translatorFunction(parts.cmpts[0], cmptContactStart) }
    );
    Monocle.Events.listenForContact(
      parts.cmpts[1].contentDocument.defaultView,
      { 'start': translatorFunction(parts.cmpts[1], cmptContactStart) }
    );
  }


  function listenForMoveAndEnd(fnMove, fnEnd) {
    listenOnElem(
      document.defaultView,
      translatorFunction(document.documentElement, fnMove),
      translatorFunction(document.documentElement, fnEnd)
    );
    for (var i = 0, ii = parts.cmpts.length; i < ii; ++i) {
      listenOnElem(
        parts.cmpts[i].contentDocument.defaultView,
        translatorFunction(parts.cmpts[i], fnMove),
        translatorFunction(parts.cmpts[i], fnEnd)
      );
    }
  }


  function listenOnElem(elem, fnMove, fnEnd) {
    var contactListeners = Monocle.Events.listenForContact(
      elem,
      {
        'move': fnMove,
        'end': function (evt) { deafenContactListeners(); fnEnd(evt); }
      }
    );
    contacts.push([elem, contactListeners]);
  }


  function deafenContactListeners() {
    for (var i = 0, ii = contacts.length; i < ii; ++i) {
      Monocle.Events.deafenForContact(contacts[i][0], contacts[i][1]);
    }
    contacts = [];
  }


  function readerContactStart(evt) {
    listenForMoveAndEnd(readerContactMove, readerContactEnd);
    action.startX = evt.m.readerX;
    statusUpdate('Lifted from '+action.startX);
  }


  function readerContactMove(evt) {
    statusUpdate('Swiping from '+action.startX+' .. '+evt.m.readerX);
    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function readerContactEnd(evt) {
    action.endX = evt.m.readerX;
    if (action.startX > halfway()) {
      if (action.endX < action.startX + LEEWAY) {
        statusUpdate('Released: turned forward');
      } else {
        statusUpdate('Cancelled: swiped left from left');
      }
    } else {
      if (action.endX > action.startX - LEEWAY) {
        statusUpdate('Released: turned backward');
      } else {
        statusUpdate('Cancelled: swiped right from right');
      }
    }
    action = {};
  }


  function cmptContactStart(evt) {
    if (actionIsCancelled(evt)) { return resetAction(); }
    action.startX = evt.m.readerX;
    listenForMoveAndEnd(cmptContactMove, cmptContactEnd);
    statusUpdate('Contact on content at '+action.startX);
  }


  function cmptContactMove(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    statusUpdate('Contact on content at '+action.startX+' .. '+evt.m.readerX);

    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function cmptContactEnd(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    action.endX = evt.m.readerX;
    if (Math.abs(action.endX - action.startX) < LEEWAY) {
      if (action.startX > halfway()) {
        statusUpdate('Tap on content: turned forward');
      } else {
        statusUpdate('Tap on content: turned backward');
      }
    } else {
      var dir = action.startX > action.endX ? 'forward' : 'backward';
      statusUpdate('Swipe on content: turned '+dir);
    }
    action = {};
  }


  // Adds two new properties to evt.m:
  // - readerX
  // - readerY
  //
  // Calculated as the offset of the click from the top left of reader element.
  //
  // Then calls the passed function.
  //
  function translatorFunction(registrant, callback) {
    return function (evt) {
      translatingReaderOffset(registrant, evt, callback);
    }
  }


  function translatingReaderOffset(registrant, evt, callback) {
    var rr = parts.reader.getBoundingClientRect();

    if (evt.target.ownerDocument.defaultView == window) {
      evt.m.readerX = Math.round(evt.m.pageX - rr.left);
      evt.m.readerY = Math.round(evt.m.pageY - rr.top);
    } else {
      var er = registrant.getBoundingClientRect();
      evt.m.readerX = Math.round((er.left - rr.left) + evt.m.clientX);
      evt.m.readerY = Math.round((er.top - rr.top) + evt.m.clientY);
    }

    callback(evt);
  }


  function halfway() {
    return parts.reader.offsetWidth / 2;
  }


  function statusUpdate(msg) {
    parts.status.innerHTML = msg;
  }


  function resetAction() {
    action = {};
    statusUpdate('Cancelled.');
  }


  function actionIsCancelled(evt) {
    var win = evt.target.ownerDocument.defaultView;
    return (evt.defaultPrevented || !win.getSelection().isCollapsed);
  }


  function actionIsEmpty() {
    return typeof action.startX == 'undefined';
  }


  window.addEventListener('load', init, false);

})();
