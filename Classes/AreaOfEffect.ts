namespace Ability {

    export enum AOETYPE {
        HEALTHUP
    }

    export class AreaOfEffect extends Game.ƒ.Node implements Interfaces.INetworkable {
        public netId: number;
        public id: AOETYPE;
        private position: Game.ƒ.Vector2; get getPosition(): Game.ƒ.Vector2 { return this.position }; set setPosition(_pos: Game.ƒ.Vector2) { this.position = _pos };
        private collider: Collider.Collider; get getCollider(): Collider.Collider { return this.collider };
        private duration: Cooldown;
        private areaMat: Game.ƒ.Material;
        private ownerNetId: number;

        private buffList: Buff.Buff[]; get getBuffList(): Buff.Buff[] { return this.buffList };
        private damageValue: number;

        constructor(_id: AOETYPE, _netId: number) {
            super(AOETYPE[_id].toLowerCase());
            Networking.IdManager(_netId);

            this.duration = new Cooldown(120);
            this.duration.onEndCooldown = this.despawn;
            this.addComponent(new Game.ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.damageValue = 1;
            this.areaMat = new ƒ.Material("aoeShader", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), UI.commonParticle));
            let cmpMat = new Game.ƒ.ComponentMaterial(this.areaMat);
            this.addComponent(cmpMat);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), 2, this.netId);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(this.collider.getRadius * 2, this.collider.getRadius * 2, 1);
        }

        public eventUpdate = (_event: Event): void => {
            this.update();
        }

        protected update(): void {
            this.collider.position = this.getParent().mtxWorld.translation.toVector2();
            this.collisionDetection();
        }
        public despawn = () => {
            console.log("despawn");
            //TODO: find right parent to cancel;
            Game.graph.removeChild(this);
            Networking.popID(this.netId);
        }

        protected spawn(_entity: Entity.Entity) {
            _entity.addChild(this);
            this.mtxLocal.translateZ(0.01);

            if (this.duration == undefined) {
                return;
            }
            else {
                this.duration.startCooldown();
            }

            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate);
        }

        public addToEntity(_entity: Entity.Entity) {
            this.spawn(_entity);
            this.ownerNetId = _entity.netId;

        }

        protected collisionDetection() {
            let colliders: Game.ƒ.Node[] = [];
            colliders = Game.graph.getChildren().filter(element => (<Entity.Entity>element).tag == Tag.TAG.ENEMY || (<Entity.Entity>element).tag == Tag.TAG.PLAYER);
            colliders.forEach(_coll => {
                let entity = (<Entity.Entity>_coll);
                if (this.collider.collides(entity.collider) && entity.attributes != undefined) {
                    //TODO: overwrite in other children to do own thing
                    this.applyAreaOfEffect(entity);
                }
            })
        }

        protected applyAreaOfEffect(_entity: Entity.Entity) {
            //TODO: overwrite in other classes
            if (this.ownerNetId != _entity.netId) {
                console.log("colliding with: " + _entity.name);
                Buff.getBuffById(Buff.BUFFID.POISON).addToEntity(_entity);
            }
        }

    }
}