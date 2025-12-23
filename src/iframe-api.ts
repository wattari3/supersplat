import { Vec3 } from 'playcanvas';
import { Events } from './events';

const IS_SCENE_DIRTY = 'supersplat:is-scene-dirty';

interface IsSceneDirtyQuery {
    type: typeof IS_SCENE_DIRTY;
}

interface IsSceneDirtyResponse {
    type: typeof IS_SCENE_DIRTY;
    result: boolean;
}

const isSceneDirtyQuery = (data: any): data is IsSceneDirtyQuery => {
    return (
        data &&
        typeof data === 'object' &&
        data.type === IS_SCENE_DIRTY
    );
};

const registerIframeApi = (events: Events) => {
    // State for tracking
    let trackingActive = false;
    let baseAzim = 0;
    let baseElev = 0;
    let baseFocalPoint: Vec3 | null = null;
    let baseRight: Vec3 | null = null;
    let baseUp: Vec3 | null = null;

    const AZIM_SCALE = 30; // Degrees per unit for rotation
    const ELEV_SCALE = 30;
    const TRANS_SCALE = 2.0; // World units per normalized face delta

    window.addEventListener('message', (event: MessageEvent) => {
        const source = event.source as Window | null;
        if (!source) {
            return;
        }

        const data = event.data;
        if (!data || typeof data !== 'object') {
            return;
        }

        if (isSceneDirtyQuery(data)) {
            const response: IsSceneDirtyResponse = {
                type: IS_SCENE_DIRTY,
                result: events.invoke('scene.dirty') as boolean
            };
            source.postMessage(response, event.origin);
        } else if (data.type === 'supersplat:start-tracking') {
            if (window.scene && window.scene.camera) {
                trackingActive = true;
                const cam = window.scene.camera;
                // Capture current state
                baseAzim = cam.azim;
                baseElev = cam.elevation;
                baseFocalPoint = cam.focalPoint.clone();
                // Capture camera orientation vectors for translation
                baseRight = cam.entity.right.clone();
                baseUp = cam.entity.up.clone();
            }
        } else if (data.type === 'supersplat:update-tracking') {
            if (trackingActive && window.scene && window.scene.camera && baseFocalPoint && baseRight && baseUp) {
                // Face position delta (for translation)
                const dx = (typeof data.dx === 'number') ? data.dx : 0;
                const dy = (typeof data.dy === 'number') ? data.dy : 0;
                // Face rotation delta (for camera rotation)
                const rotX = (typeof data.rotX === 'number') ? data.rotX : 0;
                const rotY = (typeof data.rotY === 'number') ? data.rotY : 0;

                // Translation: Move focal point based on face position
                // This creates parallax without rotating the view direction
                const newFocalPoint = baseFocalPoint.clone()
                    .add(baseRight.clone().mulScalar(dx * TRANS_SCALE))
                    .add(baseUp.clone().mulScalar(dy * TRANS_SCALE));
                window.scene.camera.setFocalPoint(newFocalPoint, 0);

                // Rotation: Apply face rotation to camera angles
                const targetAzim = baseAzim + rotY * AZIM_SCALE;
                const targetElev = baseElev + rotX * ELEV_SCALE;
                window.scene.camera.setAzimElev(targetAzim, targetElev, 0);
            }
        } else if (data.type === 'supersplat:stop-tracking') {
            trackingActive = false;
        }
    });

    // Broadcast camera pose periodically
    setInterval(() => {
        if (window.scene && window.scene.camera && window.parent) {
            const camEntity = window.scene.camera.entity;
            const pos = camEntity.getPosition();
            const rot = camEntity.getEulerAngles();

            const poseData = {
                type: 'supersplat:camera-pose',
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: { x: rot.x, y: rot.y, z: rot.z },
                fov: window.scene.camera.fov
            };

            window.parent.postMessage(poseData, '*');
        }
    }, 100);
};

export { registerIframeApi };
