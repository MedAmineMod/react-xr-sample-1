import * as THREE from 'three'

import hand0example1 from './hands/0/1.json'
import hand1example1 from './hands/1/1.json'
import { joints } from './joints'

export function fakeHand(handNum) {
  const example = handNum === 0 ? hand0example1 : hand1example1
  return {
    joints: joints
      .map((joint, jointIndex) => {
        const jointData = example.hand[jointIndex]
        // const val = { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } }
        const val = {
          jointRadius: jointData.jointRadius,
          position: new THREE.Vector3().fromArray(jointData.position),
          quaternion: new THREE.Quaternion().fromArray(jointData.quaternion)
        }
        return [joint, val]
      })
      .reduce((final, [joint, val]) => {
        final[joint] = val
        return final
      }, {})
  }
}

export function fakeHand2(handNum) {
  const scale = 2
  const initPos =
    handNum === 0
      ? {
          x: 0,
          y: 0,
          z: 0
        }
      : {
          x: 1,
          y: 0,
          z: 0
        }
  const obj = {
    joints: {
      wrist: { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'thumb-metacarpal': { jointRadius: 0.003, position: { x: 0.01, y: 1, z: 0.01 } },
      'thumb-phalanx-proximal': { jointRadius: 0.003, position: { x: 0.02, y: 1, z: 0.02 } },
      'thumb-phalanx-distal': { jointRadius: 0.003, position: { x: 0.03, y: 1, z: 0.03 } },
      'thumb-tip': { jointRadius: 0.003, position: { x: 0.035, y: 1, z: 0.035 } },
      'index-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'index-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'index-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'index-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'index-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'middle-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'middle-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'middle-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'middle-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'middle-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'ring-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'ring-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'ring-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'ring-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'ring-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'pinky-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'pinky-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'pinky-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'pinky-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
      'pinky-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } }
    }
  }
  Object.keys(obj.joints).forEach((jointName) => {
    const joint = obj.joints[jointName]
    const { position } = joint
    position.x += initPos.x
    position.y += initPos.y
    position.z += initPos.z

    position.x *= scale
    position.y *= scale
    position.z *= scale
  })
  return obj
}
