namespace Player {

    export class Player extends ƒAid.NodeSprite{
        public authority: string;
        public healthPoints: number;
        public attackPoints: number;
        public items: Array<Items.Item>;
        
        constructor(_name: string, _authority: string) {
            super(_name);
            this.authority = _authority;
        }

        public move(_direction: ƒ.Vector2) {
            if (Networking.client.id == this.authority) {
                this.mtxLocal.translate(new ƒ.Vector3(_direction.x, 0, _direction.y));
            }
        }

        public attack() {
            
        }
    }
}