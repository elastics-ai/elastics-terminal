// Mock for three.js
module.exports = {
  Scene: jest.fn(() => ({
    background: null,
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
    updateMatrixWorld: jest.fn()
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { 
      set: jest.fn(),
      x: 0,
      y: 0,
      z: 0
    },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn(),
    fov: 75,
    near: 0.1,
    far: 1000
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    domElement: {
      style: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    render: jest.fn(),
    dispose: jest.fn(),
    setClearColor: jest.fn(),
    shadowMap: {
      enabled: false,
      type: 'PCFSoftShadowMap'
    }
  })),
  Color: jest.fn(() => ({
    setHex: jest.fn(),
    setRGB: jest.fn(),
    setHSL: jest.fn(),
    r: 1,
    g: 1,
    b: 1
  })),
  AmbientLight: jest.fn(() => ({
    intensity: 1,
    color: { r: 1, g: 1, b: 1 }
  })),
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() },
    intensity: 1,
    color: { r: 1, g: 1, b: 1 },
    castShadow: false
  })),
  PointLight: jest.fn(() => ({
    position: { set: jest.fn() },
    intensity: 1,
    color: { r: 1, g: 1, b: 1 },
    castShadow: false
  })),
  PlaneGeometry: jest.fn(() => ({
    attributes: {
      position: {
        count: 100,
        array: new Float32Array(300),
        setXYZ: jest.fn(),
        getX: jest.fn(() => 0),
        getY: jest.fn(() => 0),
        setZ: jest.fn()
      }
    },
    setAttribute: jest.fn(),
    computeVertexNormals: jest.fn(),
    dispose: jest.fn()
  })),
  MeshPhongMaterial: jest.fn(() => ({
    color: { r: 1, g: 1, b: 1 },
    transparent: false,
    opacity: 1,
    dispose: jest.fn()
  })),
  Mesh: jest.fn(() => ({
    position: { set: jest.fn() },
    rotation: { 
      set: jest.fn(),
      x: 0,
      y: 0,
      z: 0
    },
    scale: { set: jest.fn() },
    material: {},
    geometry: {},
    castShadow: false,
    receiveShadow: false
  })),
  GridHelper: jest.fn(() => ({
    position: { y: 0 },
    dispose: jest.fn()
  })),
  Float32BufferAttribute: jest.fn(() => ({
    count: 100,
    array: new Float32Array(300),
    itemSize: 3
  })),
  DoubleSide: 'DoubleSide',
  Vector3: jest.fn(() => ({
    x: 0,
    y: 0,
    z: 0,
    set: jest.fn(),
    normalize: jest.fn(),
    length: jest.fn(() => 1)
  })),
  Raycaster: jest.fn(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => [])
  })),
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016),
    getElapsedTime: jest.fn(() => 1)
  }))
}