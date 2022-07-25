import { createContext, createRef, useContext } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useConeTwistConstraint } from '@react-three/cannon'
import { useXR } from '@react-three/xr'

import type { PropsWithChildren } from 'react'
import type { Triplet } from '@react-three/cannon'
import type { Object3D } from 'three'

const parent = createContext(createRef<Object3D>())

const ChainLink = ({ children }: PropsWithChildren<{}>) => {
  const parentRef = useContext(parent)
  const chainSize: Triplet = [0.015, 0.1, 0.015]
  const [ref] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize
  }))
  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8
  })
  return (
    <>
      <mesh ref={ref}>
        <cylinderBufferGeometry args={[chainSize[0], chainSize[0], chainSize[1], 8]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </>
  )
}

const Handle = ({ children, radius }: PropsWithChildren<{ radius: number }>) => {
  const { controllers } = useXR()

  const [ref, { position }] = useSphere(() => ({ type: 'Static', args: [radius], position: [0, 0, 0] }))

  // useFrame(({ mouse: { x, y }, viewport: { height, width } }) => position.set((x * width) / 2, (y * height) / 2, 0))

  useFrame(() => {
    if (!controllers || !controllers[0]) {
      return
    }
    const controller = controllers[0]
    const pos = controller.controller.position
    // position.copy(controller.controller.position)
    position.set(pos.x, pos.y - 0.1, pos.z)
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </group>
  )
}

export const ChainScene = () => {
  return (
    <Handle radius={0.05}>
      <ChainLink>
        <ChainLink>
          <ChainLink>
            <ChainLink>
              <ChainLink>
                <ChainLink>
                  <ChainLink />
                </ChainLink>
              </ChainLink>
            </ChainLink>
          </ChainLink>
        </ChainLink>
      </ChainLink>
    </Handle>
  )
}
