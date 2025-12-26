// config/characterDisplayConfig.js
// Centralized config for all scaling and offset values for knight and fighter

export const characterDisplayConfig = {
  fighter: {
    idle:      { width: 67.5 * 1.2, height: 74 * 1.2, xOffset: 0, yOffset: 10 },
    crouch:    { width: 120, height: 80, xOffset: 0, yOffset: 10 },
    crouchBig: { width: 120 * 2.5, height: 120 * 2.5, xOffset: 0, yOffset: 10 },
    run:       { width: 71.6667 * 1.2, height: 78 * 1.2, xOffset: 0, yOffset: 10 },
    jump:      { width: 65.8 * 1.2, height: 109 * 1.2, xOffset: 0, yOffset: 0 },
    attack:    { width: 103.833 * 1.2, height: 96 * 1.2, xOffset: { left: -38, right: 8 }, yOffset: 10 },
    kick:      { width: 103.833 * 1.4, height: 96 * 1.2, xOffset: { left: -46, right: 8 }, yOffset: 10 },
    dead:      { width: 67.5 * 1.2, height: 74 * 1.2, xOffset: 0, yOffset: 0 },
    backflip:  { width: 71.6667 * 1.2, height: 78 * 1.2, xOffset: 0, yOffset: 0 },
  },
  knight: {
    idle:      { width: 85, height: 86, xOffset: 0, yOffset: 10 },
    crouch:    { width: 85 *1, height: 90*0.9, xOffset: 0, yOffset: 10 },
    run:       { width: 85, height: 90, xOffset: 0, yOffset: 10 },
    jump:      { width: 85, height: 135, xOffset: 0, yOffset: 10 },
    attack:    { width: 128, height: 84, xOffset: { left: -46, right: 8 }, yOffset: 10 },
    attackFlip:{ width: 128 * 1.0, height: 84 * 1.0, xOffset: { left: -46, right: 8 }, yOffset: 10 },
    dead:      { width: 85, height: 86, xOffset: 0, yOffset: 0 },
    backflip:  { width: 85, height: 86, xOffset: 0, yOffset: 10 },
  }
};
