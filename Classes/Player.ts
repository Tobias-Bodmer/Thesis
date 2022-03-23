namespace Player {

    export class Player extends Game.ƒAid.NodeSprite {
        public authority: string;
        public items: Array<Items.Item>;
        public hero: Character;
        public position: ƒ.Vector3;

        constructor(_name: string, _authority: string, _hero: Character) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.authority = _authority;
            this.hero = _hero;
            this.position = this.cmpTransform.mtxLocal.translation;
        }

        public move(_direction: ƒ.Vector3) {
            // if (Networking.client.id == this.authority) {
            _direction.scale((1 / 60 * this.hero.attributes.speed))
            this.cmpTransform.mtxLocal.translate(_direction);
            this.position = ƒ.Vector3.SUM(this.position, _direction);
            ƒ.Debug.log("position: " + this.position);
            // }
        }

        public attack() {

        }
    }
}