var EMPWorldWind = EMPWorldWind || {};
EMPWorldWind.data = EMPWorldWind.data || {};

/**
 * @classdesc This represents an EMP layer. Any interaction with the WorldWind layer itself will occur here.
 *
 * @class
 * @param {emp.typeLibrary.WMS} wms
 */
EMPWorldWind.data.EmpWMSLayer = function(wms) {
  var layerNames, config, url;

  this.id = wms.coreId;

  var _wms = wms;

  /**
   * @name EMPWorldWind.data.EmpWMSLayer#wms
   * @type {emp.typeLibrary.WMS}
   */
  Object.defineProperty(this, 'wms', {
    enumerable: true,
    value: _wms
  });

  layerNames = wms.activeLayers.join();

  // Set the URL to the service
  if (wms.useProxy) {
    url = emp3.api.global.configuration.urlProxy + "?url=" + wms.url;
  } else {
    url = wms.url;
  }

  config = {
    service: url,
    layerNames: layerNames,
    sector: WorldWind.Sector.FULL_SPHERE,
    levelZeroDelta: new WorldWind.Location(36, 36),
    numLevels: 15,
    format: "image/png",
    size: 256
  };

  // Purposely null for now
  var timeString = '';
  var _wmsLayer = new WorldWind.WmsLayer(config, timeString);
  /**
   * @name EMPWorldWind.data.EmpWMS#layer
   * @type {WorldWind.WmsLayer}
   */
  Object.defineProperty(this, 'layer', {
    enumerable: true,
    value: _wmsLayer
  });
};
