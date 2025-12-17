import { Ring } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TOWER_CONFIGS } from '../../constants';
import type { TowerEntity, TowerType } from '../../types';
import { useGame } from '../GameState';
import { getTowerStats } from '../utils';

import { hideUnusedInstances, TEMP_COLOR, ZERO_MATRIX } from './instancing/instancedUtils';

export const InstancedTowers: React.FC<{ towers: TowerEntity[] }> = ({ towers }) => {
    const { setSelectedEntityId, selectedEntityId } = useGame();

    const baseRef = useRef<THREE.InstancedMesh>(null);
    const turretRef = useRef<THREE.InstancedMesh>(null);
    const ringRef = useRef<THREE.InstancedMesh>(null);
    const rangeRef = useRef<THREE.InstancedMesh>(null); // For selection ring

    const count = 500; // Max towers
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame(() => {
        if (!baseRef.current || !turretRef.current || !ringRef.current) return;

        towers.forEach((tower, i) => {
            if (i >= count) return;

            const config = TOWER_CONFIGS[tower.type as TowerType];
            const stats = getTowerStats(tower.type, tower.level);
            const isSelected = selectedEntityId === tower.id;

            // Base: position at [0, 0.2, 0] relative to tower center
            dummy.position.copy(tower.position).add(new THREE.Vector3(0, 0.2, 0));
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1.5, 0.4, 1.5);
            dummy.updateMatrix();
            baseRef.current?.setMatrixAt(i, dummy.matrix);
            // Base color is constant dark, but maybe we want to tint it? 
            // Original: color="#111"
            // We can just set base color in material and ignore verify.

            // Turret: position at [0, 1, 0] relative
            dummy.position.copy(tower.position).add(new THREE.Vector3(0, 1, 0));
            // Turret scale varies by level
            const tScale = 1 + (tower.level - 1) * 0.1;
            dummy.scale.set(tScale, tScale, tScale);
            dummy.rotation.set(0, 0, 0); // TODO: Rotate towards target if we had that data easily accessible here? 
            // TowerEntity has targetId, but we'd need enemy position to lookAt. 
            // For performance, maybe skip rotation or implement later. 
            // Original Tower.tsx didn't seem to rotate turret visually based on target? 
            // Checked Tower.tsx: it just renders octahedron. No lookAt logic visible in the simplified view I saw.
            dummy.updateMatrix();
            turretRef.current?.setMatrixAt(i, dummy.matrix);

            const color = config.color;
            turretRef.current?.setColorAt(i, new THREE.Color(color));

            // Rings: Floating at [0, 1, 0]
            dummy.position.copy(tower.position).add(new THREE.Vector3(0, 1, 0));
            dummy.rotation.set(Math.PI / 2, 0, 0);
            dummy.scale.set(1, 1, 1); // Ring geometry handles size
            dummy.updateMatrix();
            ringRef.current?.setMatrixAt(i, dummy.matrix);
            ringRef.current?.setColorAt(i, new THREE.Color(color));

            // Selection Range Ring
            if (isSelected && rangeRef.current) {
                // This is tricky with instancing. We only want ONE range ring usually. 
                // But if we use instancing for range rings, we can just hide all except selected.
                dummy.position.copy(tower.position).add(new THREE.Vector3(0, 0.1, 0));
                dummy.rotation.set(-Math.PI / 2, 0, 0);
                const r = stats.range;
                dummy.scale.set(r, r, 1); // scaling a unit ring? 
                // Ring geometry args are inner/outer. Scaling acts on that.
                dummy.updateMatrix();
                rangeRef.current.setMatrixAt(i, dummy.matrix);
                rangeRef.current.setColorAt(i, new THREE.Color(config.color));
            } else if (rangeRef.current) {
                rangeRef.current.setMatrixAt(i, ZERO_MATRIX);
            }
        });

        hideUnusedInstances(baseRef.current, towers.length, count);
        hideUnusedInstances(turretRef.current, towers.length, count);
        hideUnusedInstances(ringRef.current, towers.length, count);
        if (rangeRef.current) hideUnusedInstances(rangeRef.current, towers.length, count);

        baseRef.current.instanceMatrix.needsUpdate = true;
        turretRef.current.instanceMatrix.needsUpdate = true;
        if (turretRef.current.instanceColor) turretRef.current.instanceColor.needsUpdate = true;
        ringRef.current.instanceMatrix.needsUpdate = true;
        if (ringRef.current.instanceColor) ringRef.current.instanceColor.needsUpdate = true;

        if (rangeRef.current) {
            rangeRef.current.instanceMatrix.needsUpdate = true;
            if (rangeRef.current.instanceColor) rangeRef.current.instanceColor.needsUpdate = true;
        }
    });

    const handlePointerDown = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && towers[e.instanceId]) {
            setSelectedEntityId(towers[e.instanceId].id);
        }
    };

    return (
        <group>
            {/* Base */}
            <instancedMesh ref={baseRef} args={[undefined, undefined, count]} onPointerDown={handlePointerDown}>
                <boxGeometry args={[1, 1, 1]} /> {/* scaled to 1.5, 0.4, 1.5 in loop */}
                <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
            </instancedMesh>

            {/* Turret */}
            <instancedMesh ref={turretRef} args={[undefined, undefined, count]} onPointerDown={handlePointerDown}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial
                    color="black"
                    emissive="white"
                    emissiveIntensity={2}
                    roughness={0}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Floating Rings */}
            <instancedMesh ref={ringRef} args={[undefined, undefined, count]} onPointerDown={handlePointerDown}>
                <ringGeometry args={[0.6, 0.65, 32]} />
                <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
            </instancedMesh>

            {/* Range Rings - Only visible when selected */}
            <instancedMesh ref={rangeRef} args={[undefined, undefined, count]}>
                <ringGeometry args={[0.99, 1, 64]} />
                {/* We use scale to set range. 1 unit radius. */}
                <meshBasicMaterial transparent opacity={0.3} toneMapped={false} side={THREE.DoubleSide} />
            </instancedMesh>
        </group>
    );
};
