import React, {Component, PropTypes} from 'react';
import RelatedTests from '../../containers/RelatedTests';
import {VText, MapSelect, VSelect, VCheckBox} from '../shared';
import {WMTSVERSION} from '../../constants';

class CreateWMTSTest extends Component {
  constructor(props) {
    super(props);

    let selectedMapId = '';

    if (props.maps.length > 0) {
      selectedMapId = _.first(props.maps).geoId;
    }

    this.state = {
      selectedMapId: selectedMapId,
      availableLayers: [],
      selectedLayer: '',
      name: '',
      geoId: '',
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS',
      description: '',
      tileFormat: 'image/png',
      style: '',
      sampleDimension: '',
      useProxy: false,
      version: 'WMTS' // this translates to undefined.  I had to hack this
      // a little because VSelect does not allow me to specify
      // numbers as my value.
    };

    this.updateSelectedMapId = this.updateSelectedMapId.bind(this);
    this.updateWMTS = this.updateWMTS.bind(this);
    this.createWMTSAddToMap = this.createWMTSAddToMap.bind(this);
    this.createWMTS = this.createWMTS.bind(this);
    this.parseCapabilities = _.debounce(this.parseCapabilities.bind(this), 1000);
    this.getLayers = this.getLayers.bind(this);
    this.toggleLayer = this.toggleLayer.bind(this);
  }

  componentDidMount() {
    this.parseCapabilities();
  }

  componentWillReceiveProps(props) {
    if (props.maps.length > 0 && this.state.selectedMapId === '') {
      this.setState({selectedMapId: _.first(props.maps).geoId});
    }
  }

  componentDidUpdate() {
    // This upgrades all upgradable components (i.e. with 'mdl-js-*' class)
    componentHandler.upgradeDom();
  }

  toggleLayer(event) {

    let selectedLayer;

    if (this.state.selectedLayer === event.target.value) {
      selectedLayer = '';
    } else {
      selectedLayer = event.target.value;
    }

    setTimeout(this.setState({
      selectedLayer: selectedLayer
    }, this.forceUpdate), 50);
  }

  updateSelectedMapId(event) {
    this.setState({
      selectedMapId: event.target.value
    });
  }

  parseCapabilities() {
    $.get(this.state.url.trim() + '?request=GetCapabilities&service=WMTS')
      .done(data => {
        let xml = $(data);
        let root = xml.find('Layer');
        this.setState({availableLayers: this.getLayers(root)});
        toastr.success('Received Layer Information');
      })
      .fail(() => {
        toastr.error('Failed to Find Layer Information');
        this.setState({availableLayers: []});
      });
  }

  getLayers(root) {
    const layers = [];

    root.each(function() {
      if ($(this).children('ows\\:Title').text() !== '') {
        layers.push({
          name: $(this).children('ows\\:Title').text(),
          id: $(this).children('ows\\:Identifier').text()
        });
      }
    });

    return layers;
  }

  updateWMTS(event) {
    let prop = event.target.id.split('-')[1],
      newState = {...this.state};

    newState[prop] = event.target.value;
    if (prop === 'url') {
      this.setState(newState, _.debounce(this.parseCapabilities, 2000));
    } else {
      this.setState(newState);
    }
  }

  createWMTS() {
    let name = (this.state.name !== '') ? this.state.name : undefined,
      geoId = (this.state.geoId !== '') ? this.state.geoId : undefined,
      description = (this.state.description !== '') ? this.state.description : undefined,
      url = (this.state.url !== '') ? this.state.url : undefined,
      layer = (this.state.selectedLayer !== '') ? this.state.selectedLayer : undefined,
      tileFormat = (this.state.tileFormat !== '') ? this.state.tileFormat : undefined,
      version = (this.state.version !== '') ? this.state.version : undefined,
      style = (this.state.style !== '') ? this.state.style : undefined,
      sampleDimensions,
      wmts;

    /**
     * Return a string or undefined
     * @param version
     * @private
     */
    function _getVersionOrUndefined(version) {
      if (version) {
        version = version.replace(/_/g, '.');
        version = version.replace('WMTS', '');
        if (!version) {
          return;
        }
        return version;
      }
    }


    // Translate the values in the selection box to be the actual values
    // of the wms version enumeration.  If the value is just WMTS, that is
    // considered undefined.
    version = _getVersionOrUndefined(version);

    if (this.state.sampleDimensions !== '') {
      try {
        sampleDimensions = JSON.parse(this.state.sampleDimensions);
      } catch (e) {
        sampleDimensions = undefined;
      }
    }

    wmts = new emp3.api.WMTS({
      name: name,
      geoId: geoId,
      url: url,
      layer: layer,
      tileFormat: tileFormat,
      version: version,
      style: style,
      description: description,
      sampleDimensions: sampleDimensions,
      useProxy: this.state.useProxy
    });

    this.props.addMapService(wmts);

    if (wmts) {
      toastr.success('WMTS ' + name + ' added successfully');
    } else {
      toastr.error('WMTS ' + name + ' creation failed');
    }

    return wmts;
  }

  createWMTSAddToMap() {

    const wmts = this.createWMTS();
    const selectedMap = _.find(this.props.maps, {geoId: this.state.selectedMapId});

    if (!selectedMap) {
      toastr.error('Could not find specified map', 'Create Overlay Add To Map');
    } else {
      try {
        selectedMap.addMapService({
          mapService: wmts,
          onSuccess: (args) => {
            toastr.success('Added WMTS To Map \n' + JSON.stringify(args));
          },
          onError: err => {
            this.addError(err, 'map.addOverlay');
            toastr.error('Failed to Add Overlay To Map');
          }
        });
      } catch (err) {
        this.addError(err.message, 'createWMTSAddToMap:Critical');
        toastr.error(err.message, 'Create WMTS Add To Map:Critical');
      }
    }
  }

  render() {
    const {maps} = this.props;

    return (
      <div className="mdl-grid">
        <span className="mdl-layout-title">Create a WMTS Service</span>

        <div className="mdl-cell mdl-cell--12-col">
          <MapSelect id='createWMTS-mapSelect' label='Choose which map to add the service to'
                     selectedMapId={this.state.selectedMapId} callback={this.updateSelectedMapId}/>
        </div>

        <VText id='createWMTS-geoId'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.geoId} label='GeoID'
               callback={this.updateWMTS}/>

        <VText id='createWMTS-name'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.name} label='Name'
               callback={this.updateWMTS}/>

        <VText id='createWMTS-description'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.description}
               label='Description'
               callback={this.updateWMTS}/>

        <VText id='createWMTS-url'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.url} label='URL'
               callback={this.updateWMTS}/>

        <div className="mdl-cell mdl-cell--12-col">
          <span className='mdl-layout-title'>Available Layers</span>
          <ul id='availableLayersList' style={{listStyle: 'none'}}>
            {this.state.availableLayers.length === 0 ? <li>No Layers Available</li> : null}
            {this.state.availableLayers.map((layer, i) => {
              if (i > 50) {
                return; // TODO paginate the results
              }
              let checked = (this.state.selectedLayer === layer.id);

              return (
                <li key={layer.id}>
                  <label htmlFor={layer.id}>
                    <input type='checkbox' id={layer.id} value={layer.id}
                           onChange={this.toggleLayer} checked={checked}/>
                    {layer.id}
                    <span style={{fontSize: '0.8em', fontStyle: 'oblique'}}> {layer.name}</span>
                  </label>
                </li>);
            })}
          </ul>
        </div>

        <VSelect id='createWMTS-version'
                 className="mdl-cell mdl-cell--12-col"
                 label='WMTS Version'
                 values={WMTSVERSION}
                 value={this.state.version}
                 callback={this.updateWMTS}/>

        <VText id='createWMTS-layer'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.layer}
               label='Layer'
               callback={this.updateWMTS}/>

        <VText id='createWMTS-style'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.style}
               label='Style' callback={this.updateWMTS}/>

        <VText id='createWMTS-tileFormat'
               className="mdl-cell mdl-cell--12-col"
               value={this.state.tileFormat}
               label='Format' callback={this.updateWMTS}/>

        <VText id='createWMTS-sampleDimensions'
               value={this.state.sampleDimensions}
               label='Sample Dimensions'
               callback={this.updateWMTS}/>

        <VCheckBox id='createWMTS-useProxy'
                   checked={this.state.useProxy} label='Use Proxy'
                   callback={event => this.setState({useProxy: event.target.checked})}/>

        <button
          className='mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--raised mdl-button--colored mdl-cell mdl-cell--12-col'
          onClick={this.createWMTS}>
          Create WMTS
        </button>

        <button
          className='mdl-button mdl-js-button  mdl-button--raised mdl-button--colored mdl-js-ripple-effect mdl-cell mdl-cell--12-col'
          onClick={this.createWMTSAddToMap}
          disabled={maps.length === 0}>
          Add WMTS
        </button>

        <RelatedTests relatedTests={[
          {text: 'Add a Map Service', target: 'mapAddMapServiceTest'},
          {text: 'Remove a Map Service', target: 'mapRemoveMapServiceTest'},
          {text: 'Create a KML link', target: 'createKMLLayerTest'},
          {text: 'Create a WMS Service', target: 'createWMSTest'}
        ]}/>
      </div>
    );
  }
}

CreateWMTSTest.propTypes = {
  maps: PropTypes.array.isRequired,
  mapServices: PropTypes.array.isRequired,
  addResult: PropTypes.func.isRequired,
  addError: PropTypes.func.isRequired,
  addMapService: PropTypes.func.isRequired
};

export default CreateWMTSTest;
