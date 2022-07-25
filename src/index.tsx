import ReactDOM from 'react-dom'
import React, { useState, useEffect, useMemo, useRef, Fragment, forwardRef, createRef } from 'react'
import { VRCanvas, Hands, DefaultXRControllers, useXR, Interactive } from '@react-three/xr'
import { useThree, useFrame } from '@react-three/fiber'
import { Box, OrbitControls, Plane, Sphere, Sky, useMatcapTexture, Text } from '@react-three/drei'
import { usePlane, useBox, useCylinder, Physics, useSphere, Debug, useCompoundBody, useConeTwistConstraint } from '@react-three/cannon'
import niceColors from 'nice-color-palettes'
import { Color } from 'three'
import * as THREE from 'three'

import { joints } from './joints'
import { fakeHand } from './hand-faker'
import './styles.css'
import { Robot } from './HingeMotor'
import { GearTrain } from './Gears'
import { ChainScene } from './Chain'

function useFastFrame(callback: Function) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  useEffect(() => {
    const i = setInterval(() => {
      callbackRef.current()
    }, 10)
    return () => {
      clearInterval(i)
    }
  }, [])
}

function Cube({ position, mass = 100, rotation = [0, 0, 0], args = [0.06, 0.06, 0.06] }: any) {
  const [boxRef] = useBox(() => ({ position, rotation, mass, args }))
  const [tex] = useMatcapTexture('C7C0AC_2E181B_543B30_6B6270')

  return (
    <Box ref={boxRef} args={args as any} castShadow>
      <meshMatcapMaterial attach="material" matcap={tex as any} />
    </Box>
  )
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/XRHand
 */
function getHandFromRenderer(renderer: any, handNum: number) {
  const handObj = (renderer.xr as any).getHand(handNum)
  // return handObj && Object.keys(handObj.joints).length > 0 ? handObj : fakeHand(handNum)
  return handObj
  // return fakeHand(handNum)
}

function useHand(handNum: number) {
  const { gl } = useThree()
  // const handObj = (gl.xr as any).getHand(handNum)
  // return handObj;
  return getHandFromRenderer(gl, handNum)
}

function RecordHand({ hand }: { hand: number }) {
  const handObj = useHand(hand)
  let count = 0
  const threshold = 60
  useFrame(() => {
    if (!handObj) {
      return
    }
    count++
    if (count > threshold) {
      count = 0
      fetch('https://glavin001-pmndrs-react-xr-gr4q4jwh9457-3000.githubpreview.dev/', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          num: hand,
          // hand: handObj.joints
          hand: Object.keys(handObj.joints).map((jointName) => {
            const joint = handObj.joints[jointName]
            return {
              joint: joint.toJSON(),
              jointRadius: joint.jointRadius,
              position: joint.position.toArray(),
              quaternion: joint.quaternion.toArray()
            }
          })
        })
      })
        .then(console.log)
        .catch(console.error)
    }
  })
  return null
}

const JointCollider = forwardRef(({ index, hand }: { index: number; hand: number }, ref) => {
  // const { gl } = useThree()
  // const handObj = (gl.xr as any).getHand(hand)
  const handObj = useHand(hand)
  const joint = handObj.joints[joints[index]] as any
  console.log('Hand', hand, index, joints[index], joint)
  const size = Math.max(0.001, joint.jointRadius ?? 0.0001)

  const [tipRef, api] = useSphere(
    () => ({
      args: size,
      type: 'Static',
      // mass: 100,
      position: [-1, 0, 0],
      material: {
        friction: 1.0
      }
    }),
    ref
  )
  // const boxArgs = [size, size, size * 4]
  // const [boxRef, boxApi] = useBox(() => ({
  //   position: [-1, 0, 0],
  //   // rotation,
  //   mass: 1,
  //   type: 'Static',
  //   args: boxArgs
  // }))

  useFastFrame(() => {
    if (joint === undefined) return
    api.position.set(joint.position.x, joint.position.y, joint.position.z)

    // boxApi.position.set(joint.position.x, joint.position.y, joint.position.z)
    // boxApi.rotation.copy(joint.quaternion)
  })

  return (
    <>
      <Sphere ref={ref} args={[size]}>
        <meshBasicMaterial transparent opacity={0} attach="material" />
      </Sphere>
      {/* <Box ref={boxRef} args={boxArgs as any} castShadow>
        <meshBasicMaterial transparent opacity={0} attach="material" />
      </Box> */}
    </>
  )
})

function HandsReady(props: any) {
  // return props.children

  const [ready, setReady] = useState(false)
  const { gl } = useThree()
  useEffect(() => {
    if (ready) return
    // const joint = (gl.xr as any).getHand(0).joints['index-finger-tip']
    const joint = getHandFromRenderer(gl, 0).joints['index-finger-tip']
    if (joint?.jointRadius !== undefined) {
      console.log('HandsReady1')
      setReady(true)
      return
    }
    const id = setInterval(() => {
      // const joint = (gl.xr as any).getHand(0).joints['index-finger-tip']
      const joint = getHandFromRenderer(gl, 0).joints['index-finger-tip']
      if (joint?.jointRadius !== undefined) {
        console.log('HandsReady')
        setReady(true)
      }
    }, 500)
    return () => clearInterval(id)
  }, [gl, ready])

  return ready ? props.children : null
}

function getPointInBetweenByPerc(pointA, pointB, percentage) {
  var dir = pointB.clone().sub(pointA)
  var len = dir.length()
  dir = dir.normalize().multiplyScalar(len * percentage)
  return pointA.clone().add(dir)
}

// const Bone = ({ startRef, endRef }: any) => {
const Bone = ({ start, end, hand }: any) => {
  const chainSize = [0.005, 0.02, 0.01]
  const pos = [0, 10, 0]
  const args = [chainSize[0], chainSize[0], chainSize[1], 8]
  const defaultRot = [0, 1, 0]
  const defaultRotV = new THREE.Vector3().fromArray(defaultRot).normalize()

  const handObj = useHand(hand)
  const startJoint = handObj.joints[joints[start]] as any
  const endJoint = handObj.joints[joints[end]] as any
  // const size = joint.jointRadius ?? 0.0001

  const [ref, api] = useCylinder(() => ({
    // mass: 100,
    linearDamping: 0.8,
    // args: chainSize,
    args,
    type: 'Static',
    position: pos,
    rotation: defaultRot,
    allowSleep: false,
    material: {
      friction: 1.0
    }
  }))

  useFastFrame(() => {
    // if (!(startRef && startRef.current && endRef && endRef.current)) {
    if (!(startJoint && endJoint)) {
      return
    }
    // const t = clock.getElapsedTime()

    const startPos = new THREE.Vector3()
    // startRef.current.getWorldPosition(startPos)
    startPos.copy(startJoint.position)
    const endPos = new THREE.Vector3()
    // endRef.current.getWorldPosition(endPos)
    endPos.copy(endJoint.position)

    const midPos = getPointInBetweenByPerc(startPos, endPos, 0.5)
    // api.position.copy(midPos);
    api.position.set(midPos.x, midPos.y, midPos.z)

    // Vector beween 2 points
    const diffVector = new THREE.Vector3()
      .subVectors(startPos, endPos)
      // .subVectors(endPos, startPos)
      .normalize()

    // Rotation from start to end vector/direction
    // const alignVector = new THREE.Vector3().subVectors(defaultRotV, diffVector).normalize()

    const cylinderQuaternion = new THREE.Quaternion()
    // cylinderQuaternion.setFromUnitVectors(diffVector, alignVector)
    cylinderQuaternion.setFromUnitVectors(defaultRotV, diffVector)
    // cylinderQuaternion.setFromUnitVectors(diffVector, defaultRotV)

    const v = defaultRotV.clone()
    v.applyQuaternion(cylinderQuaternion)

    const e = new THREE.Euler().setFromQuaternion(cylinderQuaternion)

    // cylinderQuaternion.setFromEuler(new THREE.Euler().setFromVector3(alignVector))
    // api.rotation.copy(cylinderQuaternion)
    // api.rotation.copy(alignVector)
    // api.rotation.set(alignVector.x, alignVector.y, alignVector.z)
    // api.rotation.set(diffVector.x, diffVector.y, diffVector.z)

    // api.rotation.set(v.x, v.y, v.z)
    // api.rotation.set(v.x, 0, 0) // Rotates along Y axis
    // api.rotation.set(0, 0, -v.x * 2 * Math.PI)

    api.rotation.copy(e)

    // api.rotation.set(X, Y, Z)
    // api.rotation.set(Math.sin(t), 0, 0) // Lean forwrd/back
    // api.rotation.set(0, Math.sin(t), 0) // Spinning
    // api.rotation.set(0, 0, Math.sin(t)) // Lean left/right

    // api.rotation.set(defaultRotV.x, defaultRotV.y, defaultRotV.z)
    // api.quaternion.set(cylinderQuaternion.x, cylinderQuaternion.y, cylinderQuaternion.z, cylinderQuaternion.w)
  })

  /*
  useConeTwistConstraint(startRef, ref, {
    // pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    pivotA: [0, 0, 0],
    // pivotB: [0, 0, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8
  })
  useConeTwistConstraint(ref, endRef, {
    pivotA: [0, -chainSize[1] / 2, 0],
    // pivotB: [0, chainSize[1] / 2, 0],
    // pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8
  })
  */

  return (
    <mesh ref={ref}>
      <cylinderBufferGeometry args={args} />
      <meshStandardMaterial />
    </mesh>
  )
}

const HandColliders = ({ hand }: { hand: number }): any => {
  const refs = useMemo(() => {
    const arr = [...Array(joints.length)]
    return arr.map(() => createRef())
  }, [])

  // return refs.map((_, i) => (
  //   <Fragment key={i}>
  //     <JointCollider index={i} hand={hand} />
  //     {/* <JointCollider index={i} hand={0} /> */}
  //     {/* <JointCollider index={i} hand={1} /> */}
  //   </Fragment>
  // ))

  return (
    <>
      {refs.map((_, i) => (
        <JointCollider key={i} index={i} hand={hand} ref={refs[i]} />
      ))}
      {[
        // Thumb
        [0, 1],
        [1, 2],
        [3, 4],
        // Index finger
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 9],
        // Middle Finger
        [0, 10],
        [10, 11],
        [11, 12],
        [12, 13],
        [13, 14],
        //
        [0, 15],
        [15, 16],
        [16, 17],
        [17, 18],
        [18, 19],
        //
        [0, 20],
        [20, 21],
        [21, 22],
        [22, 23],
        [23, 24]
      ].map(([from, to]) => (
        // <Bone key={`${from}-${to}`} startRef={refs[from]} endRef={refs[to]} />
        <Bone key={`${from}-${to}`} hand={hand} start={from} end={to} />
      ))}
    </>
  )
}

const HandsColliders = (): any => {
  return (
    <>
      <HandColliders hand={0} />
      <HandColliders hand={1} />
      {/* <RecordHand hand={0} />
      <RecordHand hand={1} /> */}
    </>
  )
}

function XRControllerCollider(props: any) {
  // console.log('XRControllerCollider', props)
  const { xrController } = props
  const { controller } = xrController
  const size = 0.07
  const tipRef = useRef()
  const [, api] = useSphere(
    () => ({
      type: 'Static',
      args: size,
      position: [-1, 0, 0]
    }),
    tipRef,
    []
  )

  useFrame(() => {
    if (controller === undefined) return
    api.position.set(controller.position.x, controller.position.y, controller.position.z)
  })

  return (
    <Sphere ref={tipRef} args={[size]}>
      <meshBasicMaterial opacity={0} attach="material" />
    </Sphere>
  )
}

function XRControllerColliders() {
  const { controllers } = useXR()
  // console.log('Controllers', controllers)
  return (
    <>
      {controllers.map((xrController, index) => (
        <XRControllerCollider key={index} xrController={xrController} />
      ))}
    </>
  )
}

function Controllers() {
  return (
    <>
      <Hands />
      <HandsReady>
        <HandsColliders />
      </HandsReady>
      <DefaultXRControllers />
      {/* <XRControllerColliders /> */}
    </>
  )
}

function Button(props: any) {
  const [hover, setHover] = useState(false)
  const [color, setColor] = useState(0x123456)

  const onSelect = () => {
    setColor((Math.random() * 0xffffff) | 0)
  }

  return (
    <Interactive onSelect={onSelect} onHover={() => setHover(true)} onBlur={() => setHover(false)}>
      <Box
        // scale={hover ? [1.5, 1.5, 1.5] : [1, 1, 1]}
        args={[0.4, 0.1, 0.1]}
        {...props}>
        <meshPhongMaterial attach="material" color={color} />
        <Text position={[0, 0, 0.06]} fontSize={0.05} color="white" anchorX="center" anchorY="middle">
          Hello react-xr!
        </Text>
      </Box>
    </Interactive>
  )
}

type OurCompoundBodyProps = Pick<CompoundBodyProps, 'position' | 'rotation'> & {
  isTrigger?: boolean
  mass?: number
  setPosition?: (position: Triplet) => void
  setRotation?: (rotation: Triplet) => void
}

function CompoundBody({ isTrigger, mass = 12, setPosition, setRotation, ...props }: OurCompoundBodyProps) {
  const { scale = [1, 1, 1] } = props
  const boxSize: Triplet = [1 * scale[0], 1 * scale[1], 1 * scale[2]]
  const sphereRadius = 0.65 * scale[0]
  const [ref, api] = useCompoundBody(() => ({
    isTrigger,
    mass,
    ...props,
    shapes: [
      { type: 'Box', position: [0, 0, 0], rotation: [0, 0, 0], args: boxSize },
      { type: 'Sphere', position: [1 * scale[0], 0, 0], rotation: [0, 0, 0], args: [sphereRadius] }
    ]
  }))

  useEffect(() => {
    if (setPosition) {
      return api.position.subscribe(setPosition)
    }
  }, [api, setPosition])

  useEffect(() => {
    if (setRotation) {
      return api.rotation.subscribe(setRotation)
    }
  }, [api, setRotation])

  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxBufferGeometry args={boxSize} />
        <meshNormalMaterial />
      </mesh>
      <mesh castShadow position={[1 * scale[0], 0, 0]}>
        <sphereBufferGeometry args={[sphereRadius, 16, 16]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

function Floor() {
  const args = [10, 10]
  const [floorRef] = usePlane(() => ({
    args,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static'
  }))

  return (
    <Plane ref={floorRef} args={args} receiveShadow>
      <meshStandardMaterial attach="material" color="#fff" />
    </Plane>
  )
}

function InstancedSpheres({ number = 100 }) {
  const size = 0.1
  const [ref] = useSphere((index) => ({
    args: size,
    mass: 1,
    position: [Math.random() - 0.5, index * 0.5 + 0.5, Math.random() - 0.5]
  }))
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])

  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[undefined, undefined, number]}>
      <sphereBufferGeometry args={[size, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshPhongMaterial vertexColors />
    </instancedMesh>
  )
}

function Scene() {
  const robotRef = useRef<Object3D>(null)
  const gearsRef = useRef<Object3D>(null)
  return (
    <>
      <Sky />
      <Floor />
      {/* <Button position={[0.5, 0.5, -0.2]} /> */}
      {/* <Robot
        ref={robotRef}
        // scale={[0.1, 0.1, 0.1]}
        // scale={[0.8, 0.8, 0.8]}
        // scale={[1, 1, 1]}
        scale={[0.5, 0.5, 0.5]}
      /> */}
      <InstancedSpheres number={10} />
      {/* <GearTrain
        ref={gearsRef}
        position={[1, 1.5, -1]}
        // scale={[0.1, 0.1, 0.1]}
      /> */}
      {/* <ChainScene /> */}
      <CompoundBody position={[0.5, 1, 0.5]} rotation={[1.25, 0, 0]} scale={[0.1, 0.1, 0.1]} />
      {/* <Robot /> */}
      <Controllers />
      {[...Array(15)].map((_, i) => (
        <Cube
          key={i}
          position={[0, 1.1 + 0.2 * i, -0.5]}
          // args={[0.16, 0.16, 0.16]}
          // args={[0.04, 0.04, 0.04]}
          // args={[0.1, 0.1, 0.1]}
          args={[0.05, 0.05, 0.05]}
        />
      ))}
      {[...Array(15)].map((_, i) => (
        <Cube
          key={i}
          position={[0.5, 1.1 + 0.2 * i, -0.5]}
          // args={[0.04, 0.04, 0.04]}
          // args={[0.1, 0.1, 0.1]}
          args={[0.05, 0.05, 0.05]}
        />
      ))}
      <Cube position={[0, 1, -1]} args={[2, 0.36, 0.16]} />
      <Cube position={[0, 1, 1]} args={[2, 0.36, 0.16]} />
      <Cube position={[1.1, 1, 0]} args={[2, 0.36, 0.16]} rotation={[0, Math.PI / 2, 0]} />
      <Cube position={[-1.1, 1, 0]} args={[2, 0.36, 0.16]} rotation={[0, Math.PI / 2, 0]} />

      <OrbitControls />
      <ambientLight intensity={0.5} />
      <spotLight position={[1, 8, 1]} angle={0.3} penumbra={1} intensity={1} castShadow />
    </>
  )
}

const speed = 2

const App = () => (
  <VRCanvas shadowMap>
    <Physics
      broadphase="SAP"
      allowSleep={false}
      gravity={[0, -9.81 / speed, 0]}
      iterations={100}
      step={1 / (60 * speed)}
      defaultContactMaterial={{
        // friction: 0.09
        // contactEquationRelaxation: 4,
        // friction: 0.45 // 0.3, //1e-3,
        // frictionEquationRelaxation: 4
        friction: 0.9
      }}>
      <Debug color="red" scale={1}>
        <Scene />
      </Debug>
    </Physics>
  </VRCanvas>
)

ReactDOM.render(<App />, document.getElementById('root'))
