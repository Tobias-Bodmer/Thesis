namespace Enemy {
    enum ENEMYTYPE {
        DUMB,
        RUNNER,
        SMART,
    }

    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public properties: Player.Character;
        public aiType: ENEMYTYPE = ENEMYTYPE.DUMB;
        public target: Player.Player;
        public collider: Game.ƒ.Rectangle;
        lifetime: number;
        /**
         * Creates an Enemy
         * @param _name Name of the enemy
         * @param _properties Properties, storing attributes and stuff
         * @param _position position where to spawn
         * @param _aiType optional: standard ai = dumb
         */

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2, _aiType?: ENEMYTYPE) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.aiType = _aiType
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);

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
            switch (this.aiType) {
                case ENEMYTYPE.DUMB:
                    this.moveSimple();
                    break;

                default:
                    this.moveSimple();
                    break;
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

    export class EnemyFlee extends Enemy {

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2, _aiType?: ENEMYTYPE) {
            super(_name, _properties, _position, _aiType);
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
            this.moveAway();
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        async moveAway() {
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
        }
    }
}