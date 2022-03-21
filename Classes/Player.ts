namespace Player {

    export class Player extends Game.ƒAid.NodeSprite{
        public authority: string;
        public healthPoints: number;
        public attackPoints: number;
        public items: Array<Items.Item>;
        public speed: number;
        
        constructor(_name: string, _authority: string, _speed: number) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.authority = _authority;
            this.speed = _speed;
        }

        public move(_direction: ƒ.Vector3) {
            // if (Networking.client.id == this.authority) {
                _direction.scale((1 / Game.ƒ.Loop.timeFrameReal * this.speed))
                this.cmpTransform.mtxLocal.translate(_direction);
            // }
        }

        public attack() {
            
        }
    }
}