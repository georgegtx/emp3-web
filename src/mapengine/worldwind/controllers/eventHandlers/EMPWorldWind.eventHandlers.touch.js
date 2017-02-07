var EMPWorldWind = EMPWorldWind || {};
EMPWorldWind.eventHandlers = EMPWorldWind.eventHandlers || {};

/**
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Touch}
 * @typedef {object} Touch
 */

/**
 * @typedef {object} TouchEvent
 * @property {Touch[]} touches
 */

/**
 * Touch event handlers
 */
EMPWorldWind.eventHandlers.touch = {
  /**
   * Touch down event handler,
   * Approximates mousedown
   * @param {TouchEvent} event
   * @this EMPWorldWind.map
   */
  touchstart: function(event) {
    var coords = EMPWorldWind.utils.getEventCoordinates.call(this, event.touches[0]);

    coords.type = emp.typeLibrary.Pointer.EventType.MOUSEDOWN;
    this.state.lastMousePosition = event;
    this.empMapInstance.eventing.Pointer(coords);
  },
  /**
   * Touch end event handler
   * Approximates mouseup
   * @this EMPWorldWind.map
   */
  touchend: function(/*event*/) {
    var coords = EMPWorldWind.utils.getEventCoordinates.call(this, this.state.lastMousePosition.touches[0]);

    coords.type = emp.typeLibrary.Pointer.EventType.MOUSEUP;
    this.empMapInstance.eventing.Pointer(coords);
  },
  /**
   * Touch cancel event handler, placeholder until it is needed
   */
  touchcancel: function(/*event*/) {
    // Placeholder
    // var coords = EMPWorldWind.utils.getEventCoordinates.call(this, event.touches[0]);
    // window.console.debug(event, coords);
  },
  /**
   * Touch move event handler
   * @param {TouchEvent} event
   * @this EMPWorldWind.map
   */
  touchmove: function(event) {
    var coords = EMPWorldWind.utils.getEventCoordinates.call(this, event.touches[0]);
    coords.type = emp.typeLibrary.Pointer.EventType.MOVE;
    if (coords.lat !== undefined) {
      this.empMapInstance.eventing.Pointer(coords);
    }

    // TODO check if map is locked or not before notifying view change
    this.state.lastMousePosition = event;
    EMPWorldWind.eventHandlers.notifyViewChange.call(this);
  }
};