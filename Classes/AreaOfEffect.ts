namespace Ability {

    enum AOETYPE {
        HEALTHUP
    }

    class AreaOfEffect extends Game.ƒ.Node {
        public netId: number;
        public id: AOETYPE;
        private position: Game.ƒ.Vector2; get getPosition(): Game.ƒ.Vector2 { return this.position }; set setPosition(_pos: Game.ƒ.Vector2) { this.position = _pos };
        private collider: Collider.Collider; get getCollider(): Collider.Collider { return this.collider };
        private duration: Ability.Cooldown;
        private buffList: Buff.Buff[]; get getBuffList(): Buff.Buff[] { return this.buffList };

        constructor(_id: AOETYPE, _netId: number) {
            super(AOETYPE[_id].toLowerCase());
            Networking.IdManager(_netId);
            this.addComponent(new Game.ƒ.ComponentTransform());
        }

        protected update(): void {
            this.collider.position = this.mtxLocal.translation.toVector2();
            Networking.updateEnemyPosition()
        }
    }
}