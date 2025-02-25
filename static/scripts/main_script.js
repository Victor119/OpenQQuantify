// Replace with your own Cesium Ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNmQzM2IzYy1iNmZmLTQzOTAtODI5NC00MzE2MzY1MTdmOGQiLCJpZCI6MjQxODYyLCJpYXQiOjE3MjY0NTk1MjJ9.XhN4UNgKITt-KoENllwyeEe5CCfcr5QZ1L90ToHUt14';
//#############################################################################################
// THIS IS WHERE WE LOAD THE ENVIRONMENT FROM CESIUM

// Initialize the Cesium Viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  animation: true,
  timeline: true,
  shouldAnimate: true,
  infoBox: false, // Disable default info box
  selectionIndicator: false, // Disable default selection indicator
  shadows: true, // Enable shadows for a realistic effect
});

// Enable high dynamic range (HDR)
viewer.scene.highDynamicRange = true;
// Enable globe lighting
viewer.scene.globe.enableLighting = true;
// Add shadows
viewer.shadows = true;
viewer.scene.shadowMap.maximumDistance = 10000;
viewer.scene.shadowMap.size = 2048;
// Add atmospheric effects
viewer.scene.fog.enabled = true;
viewer.scene.skyAtmosphere.hueShift = 0.0;
viewer.scene.skyAtmosphere.saturationShift = 0.0;
viewer.scene.skyAtmosphere.brightnessShift = 0.0;

// Load 3D buildings
Cesium.createOsmBuildingsAsync().then(function(buildingTileset) {
  viewer.scene.primitives.add(buildingTileset);
  // Optionally hide a loading overlay if you have one
  // document.getElementById('loadingOverlay').style.display = 'none';
}).catch(function(error){
  console.error('Error loading buildings:', error);
});

// Set initial camera position (New York City)
const startLongitude = -74.0060;
const startLatitude = 40.7128;
const eyeHeight = 500; //
// Elevated view to see the city

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(startLongitude, startLatitude, eyeHeight),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-45.0),
    roll: 0.0
  }
});

// Enable depth testing against terrain
viewer.scene.globe.depthTestAgainstTerrain = true;

// Time settings
const start = Cesium.JulianDate.fromDate(new Date());
const stop = Cesium.JulianDate.addSeconds(start, 3600, new Cesium.JulianDate());

viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
viewer.clock.multiplier = 60;
viewer.clock.shouldAnimate = false;

viewer.timeline.zoomTo(start, stop);


//#######################################################################################################
// TTHIS IS WHERE WE LOAD IN THE OBJECTS AND MESHES
// Define asset IDs for models (Rocket and single Ultrasonic sensor)
const assetIds = {
  rocket: 2746002,
  Ultrasonic: 2750580
};

// Track selected model from the toolbar
let selectedModel = null;
let dragging = false;

// Handle dragging an item (e.g., rocket) from the toolbar
document.querySelectorAll('.draggable').forEach(item => {
  item.addEventListener('dragstart', (event) => {
    selectedModel = event.target.id;
    dragging = true;
  });
});

// Allow dropping onto Cesium container
const cesiumContainerassets = document.getElementById('cesiumContainer');

cesiumContainerassets.addEventListener('dragover', (event) => {
  event.preventDefault();
});

// DRAG AND DROP EVENTS FOR OBJECTS
cesiumContainerassets.addEventListener('drop', (event) => {
  event.preventDefault();
  if (dragging && selectedModel) {
    const canvasBounds = cesiumContainerassets.getBoundingClientRect();
    const x = event.clientX - canvasBounds.left;
    const y = event.clientY - canvasBounds.top;
    const windowPosition = new Cesium.Cartesian2(x, y);
    const earthPosition = viewer.scene.pickPosition(windowPosition);

    if (Cesium.defined(earthPosition)) {
      createModel(selectedModel, earthPosition);
    }
    dragging = false;
    selectedModel = null;
  }
});

// Utility to load and add a model entity
async function addModel(assetId, position, orientation = Cesium.Quaternion.IDENTITY) {
  try {
    const resource = await Cesium.IonResource.fromAssetId(assetId);
    return viewer.entities.add({
      position: position,
      model: { uri: resource },
      orientation: orientation
    });
  } catch (error) {
    console.error('Error loading model:', error);
    return null;
  }
}

// Create a model entity based on toolbar item
function createModel(modelType, position) {
  const assetId = assetIds[modelType];
  if (!assetId) {
    console.error(`Asset ID for model type "${modelType}" not found.`);
    return;
  }

  let orientation = Cesium.Quaternion.IDENTITY;
  // Example orientation for rocket
  if (modelType === 'rocket') {
    const xAxis = Cesium.Cartesian3.UNIT_X;
    const yAxis = Cesium.Cartesian3.UNIT_Y;
    const xAngle = Cesium.Math.toRadians(229);
    const yAngle = Cesium.Math.toRadians(79);
    const xRotation = Cesium.Quaternion.fromAxisAngle(xAxis, xAngle);
    const yRotation = Cesium.Quaternion.fromAxisAngle(yAxis, yAngle);
    orientation = Cesium.Quaternion.multiply(xRotation, yRotation, new Cesium.Quaternion());
  }

  return addModel(assetId, position, orientation);
}

// Make models movable after they are placed
let selectedEntity = null;
let baseOrientation = null;
let isDragging = false;
let downPosition = null;

// Funcție utilitară pentru a obține poziția pe glob din evenimentul mouse
function getMousePosition(event) {
  const ray = viewer.camera.getPickRay(event.position);
  if (!ray) return null;
  return viewer.scene.globe.pick(ray, viewer.scene);
}

// --- Evenimentul de LEFT_DOWN pentru selectare ---
viewer.screenSpaceEventHandler.setInputAction((event) => {
  // Salvăm poziția inițială a mouse-ului la click
  downPosition = event.position;
  // Selectăm obiectul (dacă a fost făcut clic pe unul)
  const pickedEntity = viewer.scene.pick(event.position);
  if (Cesium.defined(pickedEntity) && Cesium.defined(pickedEntity.id)) {
    selectedEntity = pickedEntity.id;
    // Salvăm orientarea curentă ca orientare de bază
    baseOrientation = selectedEntity.orientation
      ? selectedEntity.orientation.getValue(viewer.clock.currentTime)
      : Cesium.Quaternion.IDENTITY;
    
    // Resetează valorile slider-urilor la 0 (pentru rotație)
    rotationXSlider.value = 0;
    rotationYSlider.value = 0;
    rotationZSlider.value = 0;
    rotationXValue.innerText = '0°';
    rotationYValue.innerText = '0°';
    rotationZValue.innerText = '0°';
  } else {
    // Dacă nu a fost selectat niciun obiect, resetăm selecția
    selectedEntity = null;
    baseOrientation = null;
  }
  // La începutul click-ului nu este încă dragging
  isDragging = false;
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

// --- Evenimentul de MOUSE_MOVE pentru a gestiona dragging-ul ---
viewer.screenSpaceEventHandler.setInputAction((event) => {
  if (!selectedEntity) return;
  
  // Dacă nu am început încă dragging-ul, verificăm dacă mișcarea depășește un prag (ex. 5 pixeli)
  if (!isDragging) {
    const dx = event.position.x - downPosition.x;
    const dy = event.position.y - downPosition.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) { // prag de 5 pixeli
      isDragging = true;
    }
  }
  
  // Dacă se face efectiv dragging, actualizăm poziția obiectului
  if (isDragging) {
    const newPosition = getMousePosition(event);
    if (newPosition) {
      selectedEntity.position = newPosition;
    }
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// --- Evenimentul de LEFT_UP pentru a încheia dragging-ul ---
viewer.screenSpaceEventHandler.setInputAction((event) => {
  isDragging = false;
  downPosition = null;
  // Nu resetăm selectedEntity, astfel încât rotația să poată fi aplicată ulterior
}, Cesium.ScreenSpaceEventType.LEFT_UP);


// --- Controlul pentru rotație prin slider-uri ---
const rotationXSlider = document.getElementById('rotationXSlider');
const rotationYSlider = document.getElementById('rotationYSlider');
const rotationZSlider = document.getElementById('rotationZSlider');

const rotationXValue = document.getElementById('rotationXValue');
const rotationYValue = document.getElementById('rotationYValue');
const rotationZValue = document.getElementById('rotationZValue');

// Funcția care actualizează rotația obiectului selectat
function updateRotation() {
  if (selectedEntity && baseOrientation) {
    // Preluăm valorile slider-urilor și le convertim în radiani
    const xAngle = Cesium.Math.toRadians(parseFloat(rotationXSlider.value));
    const yAngle = Cesium.Math.toRadians(parseFloat(rotationYSlider.value));
    const zAngle = Cesium.Math.toRadians(parseFloat(rotationZSlider.value));

    // Calculăm quaternion-urile pentru rotațiile pe fiecare axă
    const qx = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_X, xAngle);
    const qy = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Y, yAngle);
    const qz = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, zAngle);

    // Combinăm rotațiile (aici în ordinea Z * Y * X)
    const offsetQuaternion = Cesium.Quaternion.multiply(
      qz,
      Cesium.Quaternion.multiply(qy, qx, new Cesium.Quaternion()),
      new Cesium.Quaternion()
    );

    // Aplicăm rotația offset peste orientarea de bază
    const newOrientation = Cesium.Quaternion.multiply(
      baseOrientation,
      offsetQuaternion,
      new Cesium.Quaternion()
    );
    
    selectedEntity.orientation = newOrientation;
  }
}

// Evenimentele pentru actualizarea slider-urilor
rotationXSlider.addEventListener('input', function() {
  rotationXValue.innerText = rotationXSlider.value + '°';
  updateRotation();
});

rotationYSlider.addEventListener('input', function() {
  rotationYValue.innerText = rotationYSlider.value + '°';
  updateRotation();
});

rotationZSlider.addEventListener('input', function() {
  rotationZValue.innerText = rotationZSlider.value + '°';
  updateRotation();
});

// --- Keyboard Shortcuts: Fine-grained Object Rotation ---
// Folosim tastele săgeți și Q/E pentru a modifica rotația în pași de 1°
document.addEventListener('keydown', function(event) {
  // Aplicăm shortcut-uri doar dacă un obiect este selectat
  if (!selectedEntity) return;

  // Definește pasul de rotație
  const fineStep = 1; // 1° pe apăsare

  // Gestionarea evenimentelor pentru fiecare tastă
  if (event.key === "ArrowUp") {
    // Crește rotația pe axa X
    rotationXSlider.value = parseFloat(rotationXSlider.value) + fineStep;
    rotationXValue.innerText = rotationXSlider.value + '°';
    updateRotation();
    event.preventDefault();
  } else if (event.key === "ArrowDown") {
    // Scade rotația pe axa X
    rotationXSlider.value = parseFloat(rotationXSlider.value) - fineStep;
    rotationXValue.innerText = rotationXSlider.value + '°';
    updateRotation();
    event.preventDefault();
  } else if (event.key === "ArrowRight") {
    // Crește rotația pe axa Y
    rotationYSlider.value = parseFloat(rotationYSlider.value) + fineStep;
    rotationYValue.innerText = rotationYSlider.value + '°';
    updateRotation();
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    // Scade rotația pe axa Y
    rotationYSlider.value = parseFloat(rotationYSlider.value) - fineStep;
    rotationYValue.innerText = rotationYSlider.value + '°';
    updateRotation();
    event.preventDefault();
  } else if (event.key.toLowerCase() === "e") {
    // Crește rotația pe axa Z
    rotationZSlider.value = parseFloat(rotationZSlider.value) + fineStep;
    rotationZValue.innerText = rotationZSlider.value + '°';
    updateRotation();
    event.preventDefault();
  } else if (event.key.toLowerCase() === "q") {
    // Scade rotația pe axa Z
    rotationZSlider.value = parseFloat(rotationZSlider.value) - fineStep;
    rotationZValue.innerText = rotationZSlider.value + '°';
    updateRotation();
    event.preventDefault();
  }
});

// --- Display Rotation Angles: Update Information Panel ---
// Asigură-te că ai în HTML un element cu id-ul "rotationInfo"
const rotationInfo = document.getElementById('rotationInfo');

function updateRotationInfo(entity) {
  if (!entity || !entity.orientation) {
      document.getElementById("rotationInfo").innerHTML = "<p>Rotation: N/A</p>";
      return;
  }

  // Obținem quaternion-ul entității
  var orientation = Cesium.Quaternion.clone(entity.orientation.getValue(Cesium.JulianDate.now()));
  var hpr = Cesium.HeadingPitchRoll.fromQuaternion(orientation);

  // Convertim la grade
  var heading = Cesium.Math.toDegrees(hpr.heading).toFixed(2);
  var pitch = Cesium.Math.toDegrees(hpr.pitch).toFixed(2);
  var roll = Cesium.Math.toDegrees(hpr.roll).toFixed(2);

  // Afișăm valorile
  document.getElementById("rotationInfo").innerHTML =
      `<p><strong>Rotation Angles:</strong></p>
      <p>Heading: ${heading}°</p>
      <p>Pitch: ${pitch}°</p>
      <p>Roll: ${roll}°</p>`;
}

// Funcție care se actualizează periodic
function trackEntityRotation(entity) {
  if (!entity) return;

  setInterval(() => {
      updateRotationInfo(entity);
  }, 500); // Actualizare la fiecare 500ms
}

// Exemplu: Apelare când este selectat un senzor sau un obiect

viewer.selectedEntityChanged.addEventListener(function(entity) {
  selectedEntity = entity;
  trackEntityRotation(entity);
});

// ==============
// Single Sensor
// ==============
let selectedSensorType = null;
let sensorEntities = [];
let currentSensorParam = null;
let draggingSensorItem = null;

// Only one sensor's parameters: Ultrasonic
const sensorParameters = {
  'Ultrasonic': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Ultrasonic sensors measure distance using ultrasonic waves, typically used for obstacle detection and ranging in robotics and vehicles.',
    type: 'cone',
    icon: 'https://img.icons8.com/fluency/48/000000/sensor.png',
  },

  'Omnidirectional': {
    minRange: 0.5,
    maxRange: 100,
    defaultRange: 50,
    color: '#FF00FF',
    transparency: 0.5,
    unit: 'm',
    description: 'Omnidirectional sensor that detects signals from all directions.',
    type: 'sphere',
    icon: 'https://img.icons8.com/fluency/48/000000/sensor.png'
  },

  'Geophone': {
    minRange: 0.02,
    maxRange: 10, 
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Geophone sensors detect ground vibrations and seismic waves, commonly used in geophysical surveys, earthquake monitoring, and oil exploration to analyze subsurface structures.',
    type: 'cone',
    icon: 'images/geophone.png',
  },

  'Hall Effect Sensor': {
    minRange: 0.02,
    maxRange: 10, 
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Hall Effect sensors, like the Sunkee A3144 V4, are used to detect magnetic fields and can be employed in applications such as position sensing, speed detection, and current sensing in various electronic devices and automotive systems',
    type: 'cone',
    icon: 'images/hall_effect_sensor.png',
  },

  'Hydrophone': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Hydrophones are specialized underwater microphones designed to detect sound waves in water. They are commonly used in marine research, underwater acoustics, and for monitoring marine life and environmental conditions.',
    type: 'cone',
    icon: 'images/hydrophone.png',
  },

  'Inductioncoil': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Induction coil sensors are used to detect magnetic fields and variations in their intensity, making them valuable for measuring ULF signals. These sensors are employed in applications such as monitoring electromagnetic fields, studying geological formations, and conducting research in low-frequency electromagnetic wave propagation, enabling better understanding of both natural and man-made phenomena.',
    type: 'cone',
    icon: 'images/inductioncoil.png',
  },

  'Magnetic loop antenna': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Magnetic loop antennas are specialized antennas designed for efficient operation at Very Low Frequencies (VLF). These antennas are widely used in applications such as maritime communication, research in electromagnetic field studies, and environmental monitoring.',
    type: 'cone',
    icon: 'images/magnetic_loop_antenna.png',
  },

  'Magnetometers': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'Magnetometers are sensitive instruments used to measure the strength and direction of magnetic fields, particularly effective at Ultra Low Frequencies (ULF). These sensors play a crucial role in various applications, including geological surveys, monitoring seismic activity, and studying Earth`s magnetic field variations. By detecting minute changes in magnetic fields, magnetometers provide valuable data for research in geophysics, archaeology, and environmental science',
    type: 'cone',
    icon: 'images/magnetometers.png',
  },

  'MEMS Accelerometer': {
    minRange: 0.02,
    maxRange: 10,
    defaultRange: 5,
    minFov: 1,
    maxFov: 30,
    defaultFov: 15,
    color: '#0000FF',
    unit: 'm',
    description: 'MEMS(Micro-Electro-Mechanical Systems) accelerometers are compact devices used to measure acceleration forces and vibrations, particularly effective in Low Frequency (LF) applications. These sensors leverage microfabrication technology to detect changes in motion, enabling a wide range of applications, including motion tracking, tilt sensing, and vibration analysis.',
    type: 'cone',
    icon: 'images/mems_accelerometer.png',
  }
};
//###########################################################################################
// YOU CAN ADD YOUR OWN SENSORS HERE ABOVE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//############################################################################################

// Populate sensor selection list with only the Ultrasonic sensor
const sensorListElement = document.getElementById('sensorList');
for (const sensorType in sensorParameters) {
  const li = document.createElement('li');
  li.className = 'sensor-item';
  li.draggable = true;
  li.setAttribute('data-sensor-type', sensorType);

  const img = document.createElement('img');
  img.src = sensorParameters[sensorType].icon;
  img.alt = sensorType;

  const name = document.createElement('div');
  name.className = 'sensor-name';
  name.textContent = sensorType;

  li.appendChild(img);
  li.appendChild(name);
  sensorListElement.appendChild(li);
}

// Handle sensor drag events
const sensorItems = document.getElementsByClassName('sensor-item');
Array.from(sensorItems).forEach(item => {
  item.addEventListener('dragstart', (e) => {
    selectedSensorType = item.getAttribute('data-sensor-type');
    currentSensorParam = Object.assign({}, sensorParameters[selectedSensorType]);
    displaySensorInfo(selectedSensorType, currentSensorParam);
    setupParameterControls(currentSensorParam);
    draggingSensorItem = item;
    e.dataTransfer.setData('text/plain', '');
  });
});

// Handle drop on the Cesium canvas for sensor
const cesiumContainer = viewer.container;
cesiumContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});

cesiumContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  if (selectedSensorType && currentSensorParam) {
    const canvasBounds = cesiumContainer.getBoundingClientRect();
    const x = e.clientX - canvasBounds.left;
    const y = e.clientY - canvasBounds.top;
    const windowPosition = new Cesium.Cartesian2(x, y);
    const earthPosition = viewer.scene.pickPosition(windowPosition);

    if (Cesium.defined(earthPosition)) {
      createDraggableSensor(selectedSensorType, earthPosition, currentSensorParam);
    }

    selectedSensorType = null;
    currentSensorParam = null;
    draggingSensorItem = null;
  }
});

// Simulation Controls
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const clearButton = document.getElementById('clearButton');

playButton.addEventListener('click', () => {
  viewer.clock.shouldAnimate = true;
});
pauseButton.addEventListener('click', () => {
  viewer.clock.shouldAnimate = false;
});
resetButton.addEventListener('click', () => {
  viewer.clock.currentTime = viewer.clock.startTime.clone();
  viewer.clock.shouldAnimate = false;
});
clearButton.addEventListener('click', () => {
  viewer.entities.removeAll();
  sensorEntities = [];
});

// Adaugă aici senzorul de test
createDraggableSensor('Ultrasonic', Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 0), {
  minRange: 0.02,
  maxRange: 1000,
  defaultRange: 1000,
  minFov: 1,
  maxFov: 60,
  defaultFov: 60,
  color: '#FF0000',
  unit: 'm',
  description: 'Ultrasonic sensor test with large detection range.',
  type: 'cone',
  icon: 'https://img.icons8.com/fluency/48/000000/sensor.png'
});

// Dupa ce ai creat senzorul, poti adauga entitatea de test:
const testEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
  name: "Test Object",
  point: {
    pixelSize: 10,
    color: Cesium.Color.BLUE,
  },
});

// Display sensor information
function displaySensorInfo(sensorType, sensorParam) {
  const sensorInfoElement = document.getElementById('sensorInfo');
  sensorInfoElement.innerHTML = `
    <p><strong>${sensorType}</strong></p>
    <p>${sensorParam.description}</p>
    <p>Default Range: ${sensorParam.defaultRange} ${sensorParam.unit}</p>
    <p>Default Field of View: ${sensorParam.defaultFov}°</p>
  `;
}

// Setup parameter controls for the single sensor
function setupParameterControls(sensorParam) {
  const parameterControls = document.getElementById('parameterControls');
  parameterControls.innerHTML = '';

  // Range Slider
  if (sensorParam.minRange !== undefined && sensorParam.maxRange !== undefined) {
    const rangeContainer = document.createElement('div');
    rangeContainer.className = 'slider-container';

    const rangeLabel = document.createElement('label');
    rangeLabel.textContent = `Detection Range (${sensorParam.unit}): ${sensorParam.defaultRange}`;

    const rangeSlider = document.createElement('input');
    rangeSlider.type = 'range';
    rangeSlider.min = sensorParam.minRange;
    rangeSlider.max = sensorParam.maxRange;
    rangeSlider.value = sensorParam.defaultRange;
    rangeSlider.step = '0.01';

    rangeSlider.addEventListener('input', () => {
      sensorParam.defaultRange = parseFloat(rangeSlider.value);
      rangeLabel.textContent = `Detection Range (${sensorParam.unit}): ${sensorParam.defaultRange}`;
      updateSensorVisual(sensorParam);
    });

    rangeContainer.appendChild(rangeLabel);
    rangeContainer.appendChild(rangeSlider);
    parameterControls.appendChild(rangeContainer);
  }

  // Field of View Slider
  if (sensorParam.minFov !== undefined && sensorParam.maxFov !== undefined) {
    const fovContainer = document.createElement('div');
    fovContainer.className = 'slider-container';

    const fovLabel = document.createElement('label');
    fovLabel.textContent = `Field of View (°): ${sensorParam.defaultFov}`;

    const fovSlider = document.createElement('input');
    fovSlider.type = 'range';
    fovSlider.min = sensorParam.minFov;
    fovSlider.max = sensorParam.maxFov;
    fovSlider.value = sensorParam.defaultFov;
    fovSlider.step = '1';

    fovSlider.addEventListener('input', () => {
      sensorParam.defaultFov = parseFloat(fovSlider.value);
      fovLabel.textContent = `Field of View (°): ${sensorParam.defaultFov}`;
      updateSensorVisual(sensorParam);
    });

    fovContainer.appendChild(fovLabel);
    fovContainer.appendChild(fovSlider);
    parameterControls.appendChild(fovContainer);
  }

  // Field of View Slider (for cone sensors)
  if (sensorParam.type === 'cone' && sensorParam.minFov !== undefined && sensorParam.maxFov !== undefined) {
    const fovContainer = document.createElement('div');
    fovContainer.className = 'slider-container';
    const fovLabel = document.createElement('label');
    fovLabel.textContent = `Field of View (°): ${sensorParam.defaultFov}`;
    const fovSlider = document.createElement('input');
    fovSlider.type = 'range';
    fovSlider.min = sensorParam.minFov;
    fovSlider.max = sensorParam.maxFov;
    fovSlider.value = sensorParam.defaultFov;
    Slider.value = sensorParam.defaultFov;
    fovSlider.step = '1';
    fovSlider.addEventListener('input', () => {
      sensorParam.defaultFov = parseFloat(fovSlider.value);
      fovLabel.textContent = `Field of View (°): ${sensorParam.defaultFov}`;
      updateSensorVisual(sensorParam);
    });
    fovContainer.appendChild(fovLabel);
    fovContainer.appendChild(fovSlider);
    parameterControls.appendChild(fovContainer);
  }

  // Color Picker
  const colorContainer = document.createElement('div');
  colorContainer.className = 'color-picker';

  const colorLabel = document.createElement('label');
  colorLabel.textContent = 'Sensor Color:';

  const colorInput = document.createElement('input');
  colorInput.type = 'text';
  colorInput.id = 'colorPicker';

  colorContainer.appendChild(colorLabel);
  colorContainer.appendChild(colorInput);
  parameterControls.appendChild(colorContainer);

  // Initialize Spectrum Color Picker
  $("#colorPicker").spectrum({
    color: sensorParam.color,
    showInput: true,
    preferredFormat: "hex",
    showPalette: true,
    palette: [],
    change: function(color) {
      sensorParam.color = color.toHexString();
      updateSensorVisual(sensorParam);
    }
  });


  // Transparency Slider
  const transparencyContainer = document.createElement('div');
  transparencyContainer.className = 'slider-container';
  const transparencyLabel = document.createElement('label');
  transparencyLabel.textContent = `Transparency: ${sensorParam.transparency}`;
  const transparencySlider = document.createElement('input');
  transparencySlider.type = 'range';
  transparencySlider.min = 0;
  transparencySlider.max = 1;
  transparencySlider.step = 0.05;
  transparencySlider.value = sensorParam.transparency;
  transparencySlider.addEventListener('input', () => {
    sensorParam.transparency = parseFloat(transparencySlider.value);
    transparencyLabel.textContent = `Transparency: ${sensorParam.transparency}`;
    updateSensorVisual(sensorParam);
  });
  transparencyContainer.appendChild(transparencyLabel);
  transparencyContainer.appendChild(transparencySlider);
  parameterControls.appendChild(transparencyContainer);
}

// Update sensor visualization based on parameters and check collisions
function updateSensorVisual(sensorParam) {
  sensorEntities.forEach(entity => {
    if (entity.name === `${sensorParam.type} Sensor`) {
      const range = sensorParam.defaultRange;
      const fov = sensorParam.defaultFov;
      const color = Cesium.Color.fromCssColorString(sensorParam.color).withAlpha(sensorParam.transparency);
      if (entity.cylinder) {
        entity.cylinder.length = range;
        entity.cylinder.bottomRadius = range * Math.tan(Cesium.Math.toRadians(fov / 2));
        entity.cylinder.material = color;
      } else if (entity.ellipsoid) {
        entity.ellipsoid.radii = new Cesium.Cartesian3(range, range, range);
        entity.ellipsoid.material = color;
      }
    }
  });
  sensorEntities.forEach(entity => {
    checkForCollisions(entity);
  });
}

// Create a draggable sensor entity with coverage geometry
    function createDraggableSensor(sensorType, position, sensorParam) {
  const range = sensorParam.defaultRange;
  const fov = sensorParam.defaultFov;
  const color = Cesium.Color.fromCssColorString(sensorParam.color).withAlpha(sensorParam.transparency);

  // Listă de senzori care folosesc modele 3D
  const sensorModels = {
    'Geophone': 'images/geophone.gltf',
    'Hall Effect Sensor': 'images/hall_effect_sensor.gltf',
    'Hydrophone': 'images/hydrophone.gltf',
    'Inductioncoil': 'images/inductioncoil.gltf',
    'Magnetic loop antenna': 'images/magnetic_loop_antenna.gltf',
    'Magnetometers': 'images/magnetometers.gltf',
    'MEMS Accelerometer': 'images/mems_accelerometer.gltf'
  };

  // Verifică dacă senzorul are un model 3D definit
  if (sensorModels[sensorType]) {
    const sensorEntity = viewer.entities.add({
      position: position,
      name: `${sensorParam.type} Sensor`,
      orientation: new Cesium.CallbackProperty(() => {
        return Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(sensorParam.heading || 0),
            Cesium.Math.toRadians(sensorParam.pitch || 0),
            0
          )
        );
      }, false),
      model: {
        uri: sensorModels[sensorType], // Încarcă modelul 3D corespunzător
        minimumPixelSize: 128, // Dimensiunea minimă a modelului
        maximumScale: 1000, // Scala maximă
      },
      label: {
        text: `${sensorType}`,
        font: '14pt Orbitron, sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      }
    });

    sensorEntity.sensorParam = sensorParam;
    sensorEntities.push(sensorEntity);
    makeEntityDraggable(sensorEntity, sensorParam);
    checkForCollisions(sensorEntity);
    return;
  }

  // Pentru senzorii fără model 3D, folosește conul sau sfera
  const entityOptions = {
    position: position,
    name: `${sensorParam.type} Sensor`,
    orientation: new Cesium.CallbackProperty(() => {
      return Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(sensorParam.heading || 0),
          Cesium.Math.toRadians(sensorParam.pitch || 0),
          0
        )
      );
    }, false),
    label: {
      text: `${sensorType}`,
      font: '14pt Orbitron, sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -50),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    }
  };

  if (sensorParam.type === 'cone') {
    entityOptions.cylinder = {
      length: range,
      topRadius: 0.0,
      bottomRadius: range * Math.tan(Cesium.Math.toRadians(fov / 2)),
      material: color,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      slices: 128,
    };
  } else if (sensorParam.type === 'sphere') {
    entityOptions.ellipsoid = {
      radii: new Cesium.Cartesian3(range, range, range),
      material: color,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
    };
  }

  const sensorEntity = viewer.entities.add(entityOptions);
  sensorEntity.sensorParam = sensorParam;
  sensorEntities.push(sensorEntity);
  makeEntityDraggable(sensorEntity, sensorParam);
  checkForCollisions(sensorEntity);
}

function checkForCollisions(sensorEntity) {
  const sensorPosition = sensorEntity.position.getValue(Cesium.JulianDate.now());
  const range = sensorEntity.sensorParam.defaultRange;
  const fov = sensorEntity.sensorParam.defaultFov;
  // Create a bounding volume for sensor coverage (example using a cylinder's bounding sphere)
  const coverageArea = new Cesium.Cylinder({
    center: sensorPosition,
    radius: range * Math.tan(Cesium.Math.toRadians(fov / 2)),
    height: range,
  });
  viewer.entities.values.forEach(entity => {
    if (entity !== sensorEntity && entity.boundingSphere) {
      if (Cesium.Intersect.boundingSphere(coverageArea.boundingSphere, entity.boundingSphere)) {
        highlightEntity(entity);
        showTooltip(Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, entity.position.getValue(Cesium.JulianDate.now())), `${entity.name} is within coverage!`);
      } else {
        removeHighlight(entity);
      }
    }
  });
}

function highlightEntity(entity) {
  // Change color or appearance of the entity to indicate highlight
  entity.point.color = Cesium.Color.RED.withAlpha(1.0);
}

function removeHighlight(entity) {
  // Reset the entity's appearance
  entity.point.color = Cesium.Color.WHITE.withAlpha(1.0);
}

// Variabile globale pentru controlul mișcării pe axele X, Y, Z
let selectedAxis = null;

// Adăugare butoane pentru selecția axelor
const controlsContainer = document.createElement('div');
controlsContainer.id = 'axisControls';
controlsContainer.innerHTML = `
  <button id="moveX">Move X</button>
  <button id="moveY">Move Y</button>
  <button id="moveZ">Move Z</button>
`;
document.body.appendChild(controlsContainer);

document.getElementById('moveX').addEventListener('click', () => selectedAxis = 'x');
document.getElementById('moveY').addEventListener('click', () => selectedAxis = 'y');
document.getElementById('moveZ').addEventListener('click', () => selectedAxis = 'z');

// Modificare funcție de dragging pentru a permite mișcarea pe axe specifice
function makeEntityDraggable(entity, sensorParam) {
  let isDragging = false;
  let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  
  handler.setInputAction(function (click) {
    let pickedObject = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedObject) && pickedObject.id === entity) {
      isDragging = true;
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.container.style.cursor = 'move';
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

  handler.setInputAction(function (movement) {
    if (isDragging) {
      let cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        let position = Cesium.Cartesian3.clone(entity.position.getValue(Cesium.JulianDate.now()));
        let newPosition = new Cesium.Cartesian3(position.x, position.y, position.z);

        if (selectedAxis === 'x') {
          newPosition.x = cartesian.x;
        } else if (selectedAxis === 'y') {
          newPosition.y = cartesian.y;
        } else if (selectedAxis === 'z') {
          newPosition.z = cartesian.z;
        }

        entity.position = newPosition;
        showTooltip(movement.endPosition, `Moving on ${selectedAxis.toUpperCase()} axis`);
      }
    } else {
      let pickedObject = viewer.scene.pick(movement.endPosition);
      if (Cesium.defined(pickedObject) && pickedObject.id === entity) {
        viewer.container.style.cursor = 'pointer';
      } else {
        viewer.container.style.cursor = 'default';
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  handler.setInputAction(function () {
    if (isDragging) {
      isDragging = false;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.container.style.cursor = 'default';
      hideTooltip();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_UP);
}

// Tooltip functionality
const tooltip = document.getElementById('tooltip');
function showTooltip(screenPosition, message) {
  tooltip.style.left = (screenPosition.x + 15) + 'px';
  tooltip.style.top = (screenPosition.y + 15) + 'px';
  tooltip.innerHTML = message;
  tooltip.style.display = 'block';
}
function hideTooltip() {
  tooltip.style.display = 'none';
}
function getMousePosition(event) {
  const mousePosition = new Cesium.Cartesian2(event.endPosition.x, event.endPosition.y);
  return viewer.scene.pickPosition(mousePosition);
}

// ============================
// Search Functionality
// ============================
const searchButton = document.getElementById('searchButton');
const latitudeInput = document.getElementById('latitudeInput');
const longitudeInput = document.getElementById('longitudeInput');
const searchError = document.getElementById('searchError');

function validateCoordinates(lat, lon) {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) return false;
  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) return false;
  return true;
}

searchButton.addEventListener('click', () => {
  const lat = latitudeInput.value.trim();
  const lon = longitudeInput.value.trim();

  if (!validateCoordinates(lat, lon)) {
    searchError.style.display = 'block';
    return;
  }
  searchError.style.display = 'none';

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat), 5000),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-45.0),
      roll: 0.0
    },
    duration: 2
  });
});

// Allow pressing Enter to trigger search
latitudeInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    searchButton.click();
  }
});
longitudeInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    searchButton.click();
  }
});
// ============================
// End of Search Functionality
// ============================