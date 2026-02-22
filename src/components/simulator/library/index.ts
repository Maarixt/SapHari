// ESP32 Components
export { makeESP32 } from './esp32';

// Junction (wire split node)
export { makeJunction } from './junction';

// Basic Parts Library (minimal pins + behavior flags)
export {
  makeLED,
  makeResistor,
  makeButton,
  makeBuzzer,
  makePotentiometer,
  makePotentiometerDC,
  makePIRSensor,
  makeUltrasonicSensor,
  makeTemperatureSensor,
  makeServoMotor,
  makePowerRail,
  makeGroundRail,
  COLORS
} from './parts';

// Legacy Components (full pin definitions)
export {
  makeLED as makeLEDFull,
  makeButton as makeButtonFull,
  makeBuzzer as makeBuzzerFull,
  makePotentiometer as makePotentiometerFull,
  makePIRSensor as makePIRSensorFull,
  makeUltrasonicSensor as makeUltrasonicSensorFull,
  makeTemperatureSensor as makeTemperatureSensorFull,
  makeServoMotor as makeServoMotorFull,
  makeResistor as makeResistorFull,
  makePowerRail as makePowerRailFull,
  makeGroundRail as makeGroundRailFull
} from './components';
