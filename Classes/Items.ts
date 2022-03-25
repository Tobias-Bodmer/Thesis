namespace Items {
    export class Item extends Game.ƒAid.NodeSprite implements Spawn.ISpawnable {
        public description: string;
        position: ƒ.Vector3;
        lifetime: number;

        constructor(_name: string, _description: string, _position: ƒ.Vector3, _lifetime?: number) {
            super(_name);
            this.description = _description;
            this.lifetime = _lifetime;
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translate(_position);
        }

        public lifespan(_graph: ƒ.Node): void {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                ƒ.Debug.log(this.name + ": " + this.lifetime);
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
    }
}