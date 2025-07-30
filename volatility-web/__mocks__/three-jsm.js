// Mock for three.js examples (three/examples/jsm/*)
module.exports = {
  OrbitControls: jest.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    update: jest.fn(),
    dispose: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })),
  GLTFLoader: jest.fn(() => ({
    load: jest.fn((url, onLoad) => {
      onLoad({
        scene: {
          add: jest.fn(),
          traverse: jest.fn()
        }
      })
    }),
    setPath: jest.fn()
  })),
  DragControls: jest.fn(() => ({
    enabled: true,
    addEventListener: jest.fn(),
    dispose: jest.fn()
  })),
  TransformControls: jest.fn(() => ({
    attach: jest.fn(),
    detach: jest.fn(),
    setMode: jest.fn(),
    dispose: jest.fn()
  }))
}