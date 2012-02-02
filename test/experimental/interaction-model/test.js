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
      { 'start': readerContactStart }
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
    listenOnElem(document.defaultView, fnMove, fnEnd);
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
    action.startX = evt.m.pageX;
    statusUpdate('Lifted from '+action.startX);
    evt.preventDefault();
  }


  function readerContactMove(evt) {
    statusUpdate('Swiping from '+action.startX+' .. '+evt.m.pageX);
  }


  function readerContactEnd(evt) {
    action.endX = evt.m.pageX;
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
    evt.preventDefault();
    action.startX = evt.m.pageX;
    listenForMoveAndEnd(cmptContactMove, cmptContactEnd);
    statusUpdate('Contact on content at '+action.startX);
  }


  function cmptContactMove(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    statusUpdate('Contact on content at '+action.startX+' .. '+evt.m.pageX);
  }


  function cmptContactEnd(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    action.endX = evt.m.pageX;
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


  function translatingCmptOffset(cmpt, evt, callback) {
    var n = cmpt, x = 0;
    while (n) {
      x += n.offsetLeft;
      n = n.offsetParent;
    }
    evt.m.pageX += x;
    evt.m.component = cmpt;
    callback(evt);
  }


  function translatorFunction(cmpt, fn) {
    return function (evt) { translatingCmptOffset(cmpt, evt, fn); }
  }


  function halfway() {
    return document.documentElement.scrollWidth / 2;
  }


  function statusUpdate(msg) {
    parts.status.innerHTML = msg;
  }


  function resetAction() {
    action = {};
    statusUpdate('Cancelled.');
  }


  function actionIsCancelled(evt) {
    var cmpt = evt.m.component;
    return (
      evt.defaultPrevented ||
      (cmpt && !cmpt.contentWindow.getSelection().isCollapsed)
    );
  }


  function actionIsEmpty() {
    return typeof action.startX == 'undefined';
  }


  window.addEventListener('load', init, false);

})();
