'use client'

import { useEffect, useRef } from 'react'

type SceneMode = 'ambient' | 'receipt'

export default function PremiumScene({ mode = 'ambient' }: { mode?: SceneMode }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    void import('three').then((THREE) => {
      if (disposed || !mountRef.current) return

      const mount = mountRef.current
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20)
      camera.position.set(0, 0.1, mode === 'receipt' ? 5.2 : 5.8)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setClearColor(0x000000, 0)
      mount.replaceChildren(renderer.domElement)
      renderer.domElement.setAttribute('aria-hidden', 'true')

      const group = new THREE.Group()
      scene.add(group)

      const ambient = new THREE.AmbientLight(0xffffff, 2.2)
      scene.add(ambient)
      const key = new THREE.DirectionalLight(0x8bd7ff, 4)
      key.position.set(3, 4, 5)
      scene.add(key)
      const fill = new THREE.PointLight(0x276cff, 9, 12)
      fill.position.set(-3, -1, 3)
      scene.add(fill)

      const blue = new THREE.MeshPhysicalMaterial({ color: 0x1769ff, metalness: 0.18, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.12 })
      const sky = new THREE.MeshPhysicalMaterial({ color: 0x79d9ff, metalness: 0.05, roughness: 0.08, transmission: 0.32, transparent: true, opacity: 0.72 })
      const white = new THREE.MeshPhysicalMaterial({ color: 0xf8fbff, metalness: 0.05, roughness: 0.24 })
      const dark = new THREE.MeshStandardMaterial({ color: 0x07111f, metalness: 0.7, roughness: 0.24 })

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.36, 1.65), dark)
      base.position.y = -0.95
      group.add(base)

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.45, 1.38), blue)
      body.position.y = -0.08
      group.add(body)

      const face = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.95, 0.08), white)
      face.position.set(0, -0.03, 0.72)
      group.add(face)

      const slot = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.13, 0.18), dark)
      slot.position.set(0, 0.38, 0.79)
      group.add(slot)

      const paper = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.7, 0.035), sky)
      paper.position.set(0, 1.05, 0.76)
      group.add(paper)

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 12, 72), sky)
      ring.rotation.x = Math.PI / 2
      ring.position.set(0, -0.96, 0.15)
      group.add(ring)

      for (let i = 0; i < 7; i += 1) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035 + i * 0.003, 12, 12), i % 2 ? sky : white)
        dot.position.set(-1.05 + i * 0.35, 0.72 + Math.sin(i) * 0.06, 0.82)
        group.add(dot)
      }

      if (mode === 'ambient') {
        body.scale.set(0.78, 0.78, 0.78)
        face.scale.set(0.78, 0.78, 0.78)
        slot.scale.set(0.78, 0.78, 0.78)
        paper.scale.set(0.78, 0.78, 0.78)
        group.position.set(0, 0.18, 0)
      }

      const resize = () => {
        const width = Math.max(1, mount.clientWidth)
        const height = Math.max(1, mount.clientHeight)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height, false)
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(mount)

      let frame = 0
      const animate = (time: number) => {
        const t = time * 0.001
        group.rotation.y = Math.sin(t * 0.55) * 0.22
        group.rotation.x = Math.sin(t * 0.38) * 0.035
        group.position.y += (Math.sin(t * 0.9) * 0.045 - group.position.y + (mode === 'ambient' ? 0.18 : 0)) * 0.035
        paper.position.y = (mode === 'receipt' ? 1.05 : 0.85) + Math.sin(t * 1.4) * 0.035
        ring.rotation.z = t * 0.35
        renderer.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose())
          else if (mesh.material) mesh.material.dispose()
        })
        renderer.dispose()
        mount.replaceChildren()
      }
    }).catch(() => {})

    return () => {
      disposed = true
      cleanup()
    }
  }, [mode])

  return <div ref={mountRef} className={`premium-scene premium-scene-${mode}`} aria-hidden="true" />
}
