namespace Items {
    export class Item extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public tag: Tag.Tag = Tag.Tag.ITEM;
        public description: string;
        public imgSrc: string;
        lifetime: number;

        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime?: number) {
            super(_name);
            this.description = _description;
            this.imgSrc = _imgSrc;
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