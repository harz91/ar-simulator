import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NodeMetadata } from 'shared';
import '../styles/GLBViewport.css';

interface GLBViewportProps {
    scene: THREE.Scene;
    nodes: NodeMetadata[];
    onNodeSelect: (nodeIndex: number) => void;
    selectedNodeIndex: number | null;
}

export function GLBViewport({ scene, nodes, onNodeSelect, selectedNodeIndex }: GLBViewportProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Setup camera
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;

        // Setup renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setClearColor(0xcccccc);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Auto-fit camera to scene
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;
        camera.position.z = cameraZ;
        camera.lookAt(box.getCenter(new THREE.Vector3()));

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [scene]);

    const handleNodeClick = (nodeIndex: number) => {
        onNodeSelect(nodeIndex);
    };

    return (
        <div className="glb-viewport-container">
            <div ref={containerRef} className="glb-viewport" />
            <div className="parts-list">
                <h3>Selectable Parts</h3>
                {nodes.length === 0 ? (
                    <p className="empty-message">No parts found</p>
                ) : (
                    <ul>
                        {nodes.map((node) => (
                            <li
                                key={node.nodeId}
                                className={`part-item ${selectedNodeIndex === node.nodeIndex ? 'selected' : ''}`}
                                onClick={() => handleNodeClick(node.nodeIndex)}
                            >
                                {node.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
