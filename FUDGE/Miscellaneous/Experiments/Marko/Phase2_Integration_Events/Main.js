"use strict";
///<reference types="../../../../Core/Build/FudgeCore.js"/>
var f = FudgeCore;
var FudgePhysics_Communication;
(function (FudgePhysics_Communication) {
    window.addEventListener("load", init);
    const app = document.querySelector("canvas");
    let viewPort;
    let hierarchy;
    let fps;
    const times = [];
    let fpsDisplay = document.querySelector("h2#FPS");
    let cubes = new Array();
    let hitMaterial = new f.Material("hitMat", f.ShaderFlat, new f.CoatColored(new f.Color(0.3, 0, 0, 1)));
    let triggeredMaterial = new f.Material("triggerMat", f.ShaderFlat, new f.CoatColored(new f.Color(0, 0.3, 0, 1)));
    let normalMaterial = new f.Material("NormalMat", f.ShaderFlat, new f.CoatColored(new f.Color(1, 0, 0, 1)));
    function init(_event) {
        f.Debug.log(app);
        hierarchy = new f.Node("Scene");
        let ground = createCompleteMeshNode("GroundCollider", new f.Material("Ground", f.ShaderFlat, new f.CoatColored(new f.Color(0.2, 0.2, 0.2, 1))), new f.MeshCube(), 0, f.BODY_TYPE.STATIC, f.COLLISION_GROUP.GROUP_1);
        let cmpGroundMesh = ground.getComponent(f.ComponentTransform);
        cmpGroundMesh.mtxLocal.scale(new f.Vector3(10, 0.3, 10));
        cmpGroundMesh.mtxLocal.translate(new f.Vector3(0, -1.5, 0));
        hierarchy.appendChild(ground);
        cubes[0] = createCompleteMeshNode("Cube", normalMaterial, new f.MeshCube(), 1, f.BODY_TYPE.DYNAMIC, f.COLLISION_GROUP.GROUP_2);
        let cmpCubeTransform = cubes[0].getComponent(f.ComponentTransform);
        hierarchy.appendChild(cubes[0]);
        cmpCubeTransform.mtxLocal.translate(new f.Vector3(0, 7, 0));
        cubes[1] = createCompleteMeshNode("Cube", new f.Material("Cube", f.ShaderFlat, new f.CoatColored(new f.Color(1, 0, 0, 1))), new f.MeshCube(), 1, f.BODY_TYPE.DYNAMIC, f.COLLISION_GROUP.GROUP_1);
        let cmpCubeTransform2 = cubes[1].getComponent(f.ComponentTransform);
        hierarchy.appendChild(cubes[1]);
        cmpCubeTransform2.mtxLocal.translate(new f.Vector3(0, 3.5, 0.48));
        cubes[2] = createCompleteMeshNode("Cube", new f.Material("Cube", f.ShaderFlat, new f.CoatColored(new f.Color(1, 0, 0, 1))), new f.MeshCube(), 1, f.BODY_TYPE.DYNAMIC);
        let cmpCubeTransform3 = cubes[2].getComponent(f.ComponentTransform);
        hierarchy.appendChild(cubes[2]);
        cmpCubeTransform3.mtxLocal.translate(new f.Vector3(0.6, 7, 0.5));
        cubes[3] = createCompleteMeshNode("Trigger", new f.Material("Cube", f.ShaderFlat, new f.CoatColored(new f.Color(0, 1, 0, 1))), new f.MeshSphere(), 1, f.BODY_TYPE.STATIC, f.COLLISION_GROUP.DEFAULT, f.COLLIDER_TYPE.SPHERE);
        cubes[3].getComponent(f.ComponentRigidbody).isTrigger = true;
        let cmpCubeTransform4 = cubes[3].getComponent(f.ComponentTransform);
        hierarchy.appendChild(cubes[3]);
        cmpCubeTransform4.mtxLocal.translate(new f.Vector3(0, 2.1, 0));
        let cmpLight = new f.ComponentLight(new f.LightDirectional(f.Color.CSS("WHITE")));
        cmpLight.mtxPivot.lookAt(new f.Vector3(0.5, -1, -0.8));
        hierarchy.addComponent(cmpLight);
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.clrBackground = f.Color.CSS("GREY");
        cmpCamera.mtxPivot.translate(new f.Vector3(2, 2, 10));
        cmpCamera.mtxPivot.lookAt(f.Vector3.ZERO());
        ground.getComponent(f.ComponentRigidbody).addEventListener("ColliderEnteredCollision" /* COLLISION_ENTER */, onCollisionEnter);
        cubes[3].getComponent(f.ComponentRigidbody).addEventListener("TriggerEnteredCollision" /* TRIGGER_ENTER */, onTriggerEnter);
        ground.getComponent(f.ComponentRigidbody).addEventListener("ColliderLeftCollision" /* COLLISION_EXIT */, onCollisionExit);
        cubes[3].getComponent(f.ComponentRigidbody).addEventListener("TriggerLeftCollision" /* TRIGGER_EXIT */, onTriggerExit);
        f.Physics.settings.debugDraw = true;
        f.Physics.settings.debugMode = f.PHYSICS_DEBUGMODE.CONTACTS;
        viewPort = new f.Viewport();
        viewPort.initialize("Viewport", hierarchy, cmpCamera, app);
        viewPort.showSceneGraph();
        f.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        cubes[0].getComponent(f.ComponentRigidbody).restitution = 1.3;
        f.Time.game.setScale(0.5);
        f.Physics.adjustTransforms(hierarchy);
        f.Loop.start();
    }
    function onCollisionEnter(_event) {
        f.Debug.log("ColEnter: " + _event.cmpRigidbody.getContainer().name);
        f.Debug.log("ColEnterIMPULSE: " + _event.normalImpulse);
        f.Debug.log("ColEnterPoint: " + _event.collisionPoint);
        if (_event.cmpRigidbody.getContainer().name == "Cube") {
            let cmpMaterial = _event.cmpRigidbody.getContainer().getComponent(f.ComponentMaterial);
            cmpMaterial.material = hitMaterial;
        }
    }
    function onCollisionExit(_event) {
        f.Debug.log("ColExit: " + _event.cmpRigidbody.getContainer().name);
        if (_event.cmpRigidbody.getContainer().name == "Cube") {
            let cmpMaterial = _event.cmpRigidbody.getContainer().getComponent(f.ComponentMaterial);
            cmpMaterial.material = normalMaterial;
        }
    }
    function onTriggerEnter(_event) {
        f.Debug.log("TriggerEnter: " + _event.cmpRigidbody.getContainer().name);
        f.Debug.log("TriggerEnterPoint: " + _event.collisionPoint);
        if (_event.cmpRigidbody.getContainer().name == "Cube") {
            let cmpMaterial = _event.cmpRigidbody.getContainer().getComponent(f.ComponentMaterial);
            cmpMaterial.material = triggeredMaterial;
        }
    }
    function onTriggerExit(_event) {
        f.Debug.log("TriggerExit: " + _event.cmpRigidbody.getContainer().name);
        if (_event.cmpRigidbody.getContainer().name == "Cube") {
            let cmpMaterial = _event.cmpRigidbody.getContainer().getComponent(f.ComponentMaterial);
            cmpMaterial.material = normalMaterial;
        }
    }
    function update() {
        f.Physics.world.simulate();
        viewPort.draw();
        measureFPS();
    }
    function measureFPS() {
        window.requestAnimationFrame(() => {
            const now = performance.now();
            while (times.length > 0 && times[0] <= now - 1000) {
                times.shift();
            }
            times.push(now);
            fps = times.length;
            fpsDisplay.textContent = "FPS: " + fps.toString();
        });
    }
    function createCompleteMeshNode(_name, _material, _mesh, _mass, _physicsType, _group = f.COLLISION_GROUP.DEFAULT, _collider = f.COLLIDER_TYPE.CUBE) {
        let node = new f.Node(_name);
        let cmpMesh = new f.ComponentMesh(_mesh);
        let cmpMaterial = new f.ComponentMaterial(_material);
        let cmpTransform = new f.ComponentTransform();
        let cmpRigidbody = new f.ComponentRigidbody(_mass, _physicsType, _collider, _group);
        node.addComponent(cmpMesh);
        node.addComponent(cmpMaterial);
        node.addComponent(cmpTransform);
        node.addComponent(cmpRigidbody);
        return node;
    }
})(FudgePhysics_Communication || (FudgePhysics_Communication = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDJEQUEyRDtBQUMzRCxJQUFPLENBQUMsR0FBRyxTQUFTLENBQUM7QUFJckIsSUFBVSwwQkFBMEIsQ0FzSm5DO0FBdEpELFdBQVUsMEJBQTBCO0lBRWhDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsTUFBTSxHQUFHLEdBQXNCLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEUsSUFBSSxRQUFvQixDQUFDO0lBQ3pCLElBQUksU0FBaUIsQ0FBQztJQUN0QixJQUFJLEdBQVcsQ0FBQztJQUNoQixNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7SUFDM0IsSUFBSSxVQUFVLEdBQWdCLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFL0QsSUFBSSxLQUFLLEdBQWEsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUdsQyxJQUFJLFdBQVcsR0FBZSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkgsSUFBSSxpQkFBaUIsR0FBZSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0gsSUFBSSxjQUFjLEdBQWUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFB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Q0FBQztRQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVoQyxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0FBRUwsQ0FBQyxFQXRKUywwQkFBMEIsS0FBMUIsMEJBQTBCLFFBc0puQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi8uLi8uLi8uLi9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuaW1wb3J0IGYgPSBGdWRnZUNvcmU7XHJcblxyXG5cclxuXHJcbm5hbWVzcGFjZSBGdWRnZVBoeXNpY3NfQ29tbXVuaWNhdGlvbiB7XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgY29uc3QgYXBwOiBIVE1MQ2FudmFzRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJjYW52YXNcIik7XHJcbiAgICBsZXQgdmlld1BvcnQ6IGYuVmlld3BvcnQ7XHJcbiAgICBsZXQgaGllcmFyY2h5OiBmLk5vZGU7XHJcbiAgICBsZXQgZnBzOiBudW1iZXI7XHJcbiAgICBjb25zdCB0aW1lczogbnVtYmVyW10gPSBbXTtcclxuICAgIGxldCBmcHNEaXNwbGF5OiBIVE1MRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoMiNGUFNcIik7XHJcblxyXG4gICAgbGV0IGN1YmVzOiBmLk5vZGVbXSA9IG5ldyBBcnJheSgpO1xyXG5cclxuXHJcbiAgICBsZXQgaGl0TWF0ZXJpYWw6IGYuTWF0ZXJpYWwgPSBuZXcgZi5NYXRlcmlhbChcImhpdE1hdFwiLCBmLlNoYWRlckZsYXQsIG5ldyBmLkNvYXRDb2xvcmVkKG5ldyBmLkNvbG9yKDAuMywgMCwgMCwgMSkpKTtcclxuICAgIGxldCB0cmlnZ2VyZWRNYXRlcmlhbDogZi5NYXRlcmlhbCA9IG5ldyBmLk1hdGVyaWFsKFwidHJpZ2dlck1hdFwiLCBmLlNoYWRlckZsYXQsIG5ldyBmLkNvYXRDb2xvcmVkKG5ldyBmLkNvbG9yKDAsIDAuMywgMCwgMSkpKTtcclxuICAgIGxldCBub3JtYWxNYXRlcmlhbDogZi5NYXRlcmlhbCA9IG5ldyBmLk1hdGVyaWFsKFwiTm9ybWFsTWF0XCIsIGYuU2hhZGVyRmxhdCwgbmV3IGYuQ29hdENvbG9yZWQobmV3IGYuQ29sb3IoMSwgMCwgMCwgMSkpKTtcclxuXHJcblxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KF9ldmVudDogRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICBmLkRlYnVnLmxvZyhhcHApO1xyXG4gICAgICAgIGhpZXJhcmNoeSA9IG5ldyBmLk5vZGUoXCJTY2VuZVwiKTtcclxuXHJcbiAgICAgICAgbGV0IGdyb3VuZDogZi5Ob2RlID0gY3JlYXRlQ29tcGxldGVNZXNoTm9kZShcIkdyb3VuZENvbGxpZGVyXCIsIG5ldyBmLk1hdGVyaWFsKFwiR3JvdW5kXCIsIGYuU2hhZGVyRmxhdCwgbmV3IGYuQ29hdENvbG9yZWQobmV3IGYuQ29sb3IoMC4yLCAwLjIsIDAuMiwgMSkpKSwgbmV3IGYuTWVzaEN1YmUoKSwgMCwgZi5QSFlTSUNTX1RZUEUuU1RBVElDLCBmLlBIWVNJQ1NfR1JPVVAuR1JPVVBfMSk7XHJcbiAgICAgICAgbGV0IGNtcEdyb3VuZE1lc2g6IGYuQ29tcG9uZW50VHJhbnNmb3JtID0gZ3JvdW5kLmdldENvbXBvbmVudChmLkNvbXBvbmVudFRyYW5zZm9ybSk7XHJcbiAgICAgICAgY21wR3JvdW5kTWVzaC5tdHhMb2NhbC5zY2FsZShuZXcgZi5WZWN0b3IzKDEwLCAwLjMsIDEwKSk7XHJcblxyXG4gICAgICAgIGNtcEdyb3VuZE1lc2gubXR4TG9jYWwudHJhbnNsYXRlKG5ldyBmLlZlY3RvcjMoMCwgLTEuNSwgMCkpO1xyXG4gICAgICAgIGhpZXJhcmNoeS5hcHBlbmRDaGlsZChncm91bmQpO1xyXG5cclxuICAgICAgICBjdWJlc1swXSA9IGNyZWF0ZUNvbXBsZXRlTWVzaE5vZGUoXCJDdWJlXCIsIG5vcm1hbE1hdGVyaWFsLCBuZXcgZi5NZXNoQ3ViZSgpLCAxLCBmLlBIWVNJQ1NfVFlQRS5EWU5BTUlDLCBmLlBIWVNJQ1NfR1JPVVAuR1JPVVBfMik7XHJcbiAgICAgICAgbGV0IGNtcEN1YmVUcmFuc2Zvcm06IGYuQ29tcG9uZW50VHJhbnNmb3JtID0gY3ViZXNbMF0uZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50VHJhbnNmb3JtKTtcclxuICAgICAgICBoaWVyYXJjaHkuYXBwZW5kQ2hpbGQoY3ViZXNbMF0pO1xyXG4gICAgICAgIGNtcEN1YmVUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKG5ldyBmLlZlY3RvcjMoMCwgNywgMCkpO1xyXG5cclxuICAgICAgICBjdWJlc1sxXSA9IGNyZWF0ZUNvbXBsZXRlTWVzaE5vZGUoXCJDdWJlXCIsIG5ldyBmLk1hdGVyaWFsKFwiQ3ViZVwiLCBmLlNoYWRlckZsYXQsIG5ldyBmLkNvYXRDb2xvcmVkKG5ldyBmLkNvbG9yKDEsIDAsIDAsIDEpKSksIG5ldyBmLk1lc2hDdWJlKCksIDEsIGYuUEhZU0lDU19UWVBFLkRZTkFNSUMsIGYuUEhZU0lDU19HUk9VUC5HUk9VUF8xKTtcclxuICAgICAgICBsZXQgY21wQ3ViZVRyYW5zZm9ybTI6IGYuQ29tcG9uZW50VHJhbnNmb3JtID0gY3ViZXNbMV0uZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50VHJhbnNmb3JtKTtcclxuICAgICAgICBoaWVyYXJjaHkuYXBwZW5kQ2hpbGQoY3ViZXNbMV0pO1xyXG4gICAgICAgIGNtcEN1YmVUcmFuc2Zvcm0yLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgZi5WZWN0b3IzKDAsIDMuNSwgMC40OCkpO1xyXG5cclxuICAgICAgICBjdWJlc1syXSA9IGNyZWF0ZUNvbXBsZXRlTWVzaE5vZGUoXCJDdWJlXCIsIG5ldyBmLk1hdGVyaWFsKFwiQ3ViZVwiLCBmLlNoYWRlckZsYXQsIG5ldyBmLkNvYXRDb2xvcmVkKG5ldyBmLkNvbG9yKDEsIDAsIDAsIDEpKSksIG5ldyBmLk1lc2hDdWJlKCksIDEsIGYuUEhZU0lDU19UWVBFLkRZTkFNSUMpO1xyXG4gICAgICAgIGxldCBjbXBDdWJlVHJhbnNmb3JtMzogZi5Db21wb25lbnRUcmFuc2Zvcm0gPSBjdWJlc1syXS5nZXRDb21wb25lbnQoZi5Db21wb25lbnRUcmFuc2Zvcm0pO1xyXG4gICAgICAgIGhpZXJhcmNoeS5hcHBlbmRDaGlsZChjdWJlc1syXSk7XHJcbiAgICAgICAgY21wQ3ViZVRyYW5zZm9ybTMubXR4TG9jYWwudHJhbnNsYXRlKG5ldyBmLlZlY3RvcjMoMC42LCA3LCAwLjUpKTtcclxuXHJcbiAgICAgICAgY3ViZXNbM10gPSBjcmVhdGVDb21wbGV0ZU1lc2hOb2RlKFwiVHJpZ2dlclwiLCBuZXcgZi5NYXRlcmlhbChcIkN1YmVcIiwgZi5TaGFkZXJGbGF0LCBuZXcgZi5Db2F0Q29sb3JlZChuZXcgZi5Db2xvcigwLCAxLCAwLCAxKSkpLCBuZXcgZi5NZXNoU3BoZXJlKCksIDEsIGYuUEhZU0lDU19UWVBFLlNUQVRJQywgZi5QSFlTSUNTX0dST1VQLkRFRkFVTFQsIGYuQ09MTElERVJfVFlQRS5TUEhFUkUpO1xyXG4gICAgICAgIGN1YmVzWzNdLmdldENvbXBvbmVudChmLkNvbXBvbmVudFJpZ2lkYm9keSkuaXNUcmlnZ2VyID0gdHJ1ZTtcclxuICAgICAgICBsZXQgY21wQ3ViZVRyYW5zZm9ybTQ6IGYuQ29tcG9uZW50VHJhbnNmb3JtID0gY3ViZXNbM10uZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50VHJhbnNmb3JtKTtcclxuICAgICAgICBoaWVyYXJjaHkuYXBwZW5kQ2hpbGQoY3ViZXNbM10pO1xyXG4gICAgICAgIGNtcEN1YmVUcmFuc2Zvcm00Lm10eExvY2FsLnRyYW5zbGF0ZShuZXcgZi5WZWN0b3IzKDAsIDIuMSwgMCkpO1xyXG5cclxuICAgICAgICBsZXQgY21wTGlnaHQ6IGYuQ29tcG9uZW50TGlnaHQgPSBuZXcgZi5Db21wb25lbnRMaWdodChuZXcgZi5MaWdodERpcmVjdGlvbmFsKGYuQ29sb3IuQ1NTKFwiV0hJVEVcIikpKTtcclxuICAgICAgICBjbXBMaWdodC5tdHhQaXZvdC5sb29rQXQobmV3IGYuVmVjdG9yMygwLjUsIC0xLCAtMC44KSk7XHJcbiAgICAgICAgaGllcmFyY2h5LmFkZENvbXBvbmVudChjbXBMaWdodCk7XHJcblxyXG4gICAgICAgIGxldCBjbXBDYW1lcmE6IGYuQ29tcG9uZW50Q2FtZXJhID0gbmV3IGYuQ29tcG9uZW50Q2FtZXJhKCk7XHJcbiAgICAgICAgY21wQ2FtZXJhLmNsckJhY2tncm91bmQgPSBmLkNvbG9yLkNTUyhcIkdSRVlcIik7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgZi5WZWN0b3IzKDIsIDIsIDEwKSk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90Lmxvb2tBdChmLlZlY3RvcjMuWkVSTygpKTtcclxuXHJcbiAgICAgICAgZ3JvdW5kLmdldENvbXBvbmVudChmLkNvbXBvbmVudFJpZ2lkYm9keSkuYWRkRXZlbnRMaXN0ZW5lcihmLkVWRU5UX1BIWVNJQ1MuQ09MTElTSU9OX0VOVEVSLCBvbkNvbGxpc2lvbkVudGVyKTtcclxuICAgICAgICBjdWJlc1szXS5nZXRDb21wb25lbnQoZi5Db21wb25lbnRSaWdpZGJvZHkpLmFkZEV2ZW50TGlzdGVuZXIoZi5FVkVOVF9QSFlTSUNTLlRSSUdHRVJfRU5URVIsIG9uVHJpZ2dlckVudGVyKTtcclxuICAgICAgICBncm91bmQuZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50UmlnaWRib2R5KS5hZGRFdmVudExpc3RlbmVyKGYuRVZFTlRfUEhZU0lDUy5DT0xMSVNJT05fRVhJVCwgb25Db2xsaXNpb25FeGl0KTtcclxuICAgICAgICBjdWJlc1szXS5nZXRDb21wb25lbnQoZi5Db21wb25lbnRSaWdpZGJvZHkpLmFkZEV2ZW50TGlzdGVuZXIoZi5FVkVOVF9QSFlTSUNTLlRSSUdHRVJfRVhJVCwgb25UcmlnZ2VyRXhpdCk7XHJcblxyXG4gICAgICAgIGYuUGh5c2ljcy5zZXR0aW5ncy5kZWJ1Z0RyYXcgPSB0cnVlO1xyXG4gICAgICAgIGYuUGh5c2ljcy5zZXR0aW5ncy5kZWJ1Z01vZGUgPSBmLlBIWVNJQ1NfREVCVUdNT0RFLkNPTlRBQ1RTO1xyXG4gICAgICAgIHZpZXdQb3J0ID0gbmV3IGYuVmlld3BvcnQoKTtcclxuICAgICAgICB2aWV3UG9ydC5pbml0aWFsaXplKFwiVmlld3BvcnRcIiwgaGllcmFyY2h5LCBjbXBDYW1lcmEsIGFwcCk7XHJcbiAgICAgICAgdmlld1BvcnQuc2hvd1NjZW5lR3JhcGgoKTtcclxuICAgICAgICBmLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcihmLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAgICAgY3ViZXNbMF0uZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50UmlnaWRib2R5KS5yZXN0aXR1dGlvbiA9IDEuMztcclxuICAgICAgICBmLlRpbWUuZ2FtZS5zZXRTY2FsZSgwLjUpO1xyXG4gICAgICAgIGYuUGh5c2ljcy5hZGp1c3RUcmFuc2Zvcm1zKGhpZXJhcmNoeSk7XHJcbiAgICAgICAgZi5Mb29wLnN0YXJ0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb25Db2xsaXNpb25FbnRlcihfZXZlbnQ6IGYuRXZlbnRQaHlzaWNzKTogdm9pZCB7XHJcbiAgICAgICAgZi5EZWJ1Zy5sb2coXCJDb2xFbnRlcjogXCIgKyBfZXZlbnQuY21wUmlnaWRib2R5LmdldENvbnRhaW5lcigpLm5hbWUpO1xyXG4gICAgICAgIGYuRGVidWcubG9nKFwiQ29sRW50ZXJJTVBVTFNFOiBcIiArIF9ldmVudC5ub3JtYWxJbXB1bHNlKTtcclxuICAgICAgICBmLkRlYnVnLmxvZyhcIkNvbEVudGVyUG9pbnQ6IFwiICsgX2V2ZW50LmNvbGxpc2lvblBvaW50KTtcclxuICAgICAgICBpZiAoX2V2ZW50LmNtcFJpZ2lkYm9keS5nZXRDb250YWluZXIoKS5uYW1lID09IFwiQ3ViZVwiKSB7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogZi5Db21wb25lbnRNYXRlcmlhbCA9IF9ldmVudC5jbXBSaWdpZGJvZHkuZ2V0Q29udGFpbmVyKCkuZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICBjbXBNYXRlcmlhbC5tYXRlcmlhbCA9IGhpdE1hdGVyaWFsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvbkNvbGxpc2lvbkV4aXQoX2V2ZW50OiBmLkV2ZW50UGh5c2ljcyk6IHZvaWQge1xyXG4gICAgICAgIGYuRGVidWcubG9nKFwiQ29sRXhpdDogXCIgKyBfZXZlbnQuY21wUmlnaWRib2R5LmdldENvbnRhaW5lcigpLm5hbWUpO1xyXG4gICAgICAgIGlmIChfZXZlbnQuY21wUmlnaWRib2R5LmdldENvbnRhaW5lcigpLm5hbWUgPT0gXCJDdWJlXCIpIHtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiBmLkNvbXBvbmVudE1hdGVyaWFsID0gX2V2ZW50LmNtcFJpZ2lkYm9keS5nZXRDb250YWluZXIoKS5nZXRDb21wb25lbnQoZi5Db21wb25lbnRNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIGNtcE1hdGVyaWFsLm1hdGVyaWFsID0gbm9ybWFsTWF0ZXJpYWw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG9uVHJpZ2dlckVudGVyKF9ldmVudDogZi5FdmVudFBoeXNpY3MpOiB2b2lkIHtcclxuICAgICAgICBmLkRlYnVnLmxvZyhcIlRyaWdnZXJFbnRlcjogXCIgKyBfZXZlbnQuY21wUmlnaWRib2R5LmdldENvbnRhaW5lcigpLm5hbWUpO1xyXG4gICAgICAgIGYuRGVidWcubG9nKFwiVHJpZ2dlckVudGVyUG9pbnQ6IFwiICsgX2V2ZW50LmNvbGxpc2lvblBvaW50KTtcclxuICAgICAgICBpZiAoX2V2ZW50LmNtcFJpZ2lkYm9keS5nZXRDb250YWluZXIoKS5uYW1lID09IFwiQ3ViZVwiKSB7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogZi5Db21wb25lbnRNYXRlcmlhbCA9IF9ldmVudC5jbXBSaWdpZGJvZHkuZ2V0Q29udGFpbmVyKCkuZ2V0Q29tcG9uZW50KGYuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICBjbXBNYXRlcmlhbC5tYXRlcmlhbCA9IHRyaWdnZXJlZE1hdGVyaWFsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblRyaWdnZXJFeGl0KF9ldmVudDogZi5FdmVudFBoeXNpY3MpOiB2b2lkIHtcclxuICAgICAgICBmLkRlYnVnLmxvZyhcIlRyaWdnZXJFeGl0OiBcIiArIF9ldmVudC5jbXBSaWdpZGJvZHkuZ2V0Q29udGFpbmVyKCkubmFtZSk7XHJcbiAgICAgICAgaWYgKF9ldmVudC5jbXBSaWdpZGJvZHkuZ2V0Q29udGFpbmVyKCkubmFtZSA9PSBcIkN1YmVcIikge1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IGYuQ29tcG9uZW50TWF0ZXJpYWwgPSBfZXZlbnQuY21wUmlnaWRib2R5LmdldENvbnRhaW5lcigpLmdldENvbXBvbmVudChmLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgY21wTWF0ZXJpYWwubWF0ZXJpYWwgPSBub3JtYWxNYXRlcmlhbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZSgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgZi5QaHlzaWNzLndvcmxkLnNpbXVsYXRlKCk7XHJcbiAgICAgICAgdmlld1BvcnQuZHJhdygpO1xyXG4gICAgICAgIG1lYXN1cmVGUFMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtZWFzdXJlRlBTKCk6IHZvaWQge1xyXG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBub3c6IG51bWJlciA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG4gICAgICAgICAgICB3aGlsZSAodGltZXMubGVuZ3RoID4gMCAmJiB0aW1lc1swXSA8PSBub3cgLSAxMDAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aW1lcy5zaGlmdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRpbWVzLnB1c2gobm93KTtcclxuICAgICAgICAgICAgZnBzID0gdGltZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICBmcHNEaXNwbGF5LnRleHRDb250ZW50ID0gXCJGUFM6IFwiICsgZnBzLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlQ29tcGxldGVNZXNoTm9kZShfbmFtZTogc3RyaW5nLCBfbWF0ZXJpYWw6IGYuTWF0ZXJpYWwsIF9tZXNoOiBmLk1lc2gsIF9tYXNzOiBudW1iZXIsIF9waHlzaWNzVHlwZTogZi5QSFlTSUNTX1RZUEUsIF9ncm91cDogZi5QSFlTSUNTX0dST1VQID0gZi5QSFlTSUNTX0dST1VQLkRFRkFVTFQsIF9jb2xsaWRlcjogZi5DT0xMSURFUl9UWVBFID0gZi5DT0xMSURFUl9UWVBFLkNVQkUpOiBmLk5vZGUge1xyXG4gICAgICAgIGxldCBub2RlOiBmLk5vZGUgPSBuZXcgZi5Ob2RlKF9uYW1lKTtcclxuICAgICAgICBsZXQgY21wTWVzaDogZi5Db21wb25lbnRNZXNoID0gbmV3IGYuQ29tcG9uZW50TWVzaChfbWVzaCk7XHJcbiAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiBmLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IGYuQ29tcG9uZW50TWF0ZXJpYWwoX21hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgbGV0IGNtcFRyYW5zZm9ybTogZi5Db21wb25lbnRUcmFuc2Zvcm0gPSBuZXcgZi5Db21wb25lbnRUcmFuc2Zvcm0oKTtcclxuXHJcblxyXG4gICAgICAgIGxldCBjbXBSaWdpZGJvZHk6IGYuQ29tcG9uZW50UmlnaWRib2R5ID0gbmV3IGYuQ29tcG9uZW50UmlnaWRib2R5KF9tYXNzLCBfcGh5c2ljc1R5cGUsIF9jb2xsaWRlciwgX2dyb3VwKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgbm9kZS5hZGRDb21wb25lbnQoY21wVHJhbnNmb3JtKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBSaWdpZGJvZHkpO1xyXG5cclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuXHJcbn0iXX0=