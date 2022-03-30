namespace Enemy {

    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public properties: Player.Character;
        public smart: boolean = false;
        public target: Player.Player;
        public collider: Game.ƒ.Rectangle;
        lifetime: number;
        position: [number, number];

        constructor(_name: string, _properties: Player.Character, _position: [number, number]) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;

            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position[0], _position[1], 0);

            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }

        async move() {
            this.target = Game.player;

            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);

                if (distancePlayer1 < distancePlayer2) {
                    this.target = Game.player;
                } else {
                    this.target = Game.player2;
                }
            }

            if (this.smart) {

            } else {
                this.moveSimple();
            }
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }

        async moveSimple() {
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.cmpTransform.mtxLocal.translation, this.cmpTransform.mtxLocal.translation);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
        }

        async lifespan(_graph: Game.ƒ.Node) {
            if (this.properties.attributes.healthPoints <= 0) {
                _graph.removeChild(this);
            }
        }
    }
}