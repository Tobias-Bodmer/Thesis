namespace Collider {
    export class Collider {
        public ownerNetId: number;
        private radius: number; get getRadius(): number { return this.radius };
        public position: ƒ.Vector2;

        get top(): number {
            return (this.position.y - this.radius);
        }
        get left(): number {
            return (this.position.x - this.radius);
        }
        get right(): number {
            return (this.position.x + this.radius);
        }
        get bottom(): number {
            return (this.position.y + this.radius);
        }

        constructor(_position: ƒ.Vector2, _radius: number, _netId: number) {
            this.position = _position;
            this.radius = _radius;
            this.ownerNetId = _netId;
        }

        public setPosition(_position: Game.ƒ.Vector2) {
            this.position = _position;
        }

        public setRadius(_newRadius: number) {
            this.radius = _newRadius;
        }

        collides(_collider: Collider): boolean {
            let distance: ƒ.Vector2 = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            if (this.radius + _collider.radius > distance.magnitude) {
                return true;
            }
            return false;
        }

        collidesRect(_collider: Game.ƒ.Rectangle): boolean {
            if (this.left > _collider.right) return false;
            if (this.right < _collider.left) return false;
            if (this.top > _collider.bottom) return false;
            if (this.bottom < _collider.top) return false;
            return true;
        }

        getIntersection(_collider: Collider): number {
            if (!this.collides(_collider))
                return null;

            let distance: ƒ.Vector2 = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            let intersection = this.radius + _collider.radius - distance.magnitude;

            return intersection;
        }

        getIntersectionRect(_collider: ƒ.Rectangle): ƒ.Rectangle {
            if (!this.collidesRect(_collider))
                return null;

            let intersection: ƒ.Rectangle = new ƒ.Rectangle();
            intersection.x = Math.max(this.left, _collider.left);
            intersection.y = Math.max(this.top, _collider.top);
            intersection.width = Math.min(this.right, _collider.right) - intersection.x;
            intersection.height = Math.min(this.bottom, _collider.bottom) - intersection.y;

            return intersection;
        }
    }
}