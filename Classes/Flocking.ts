namespace Enemy {

    export class FlockingBehaviour {
        private currentNeighbours: Enemy[];
        public sightRadius: number;
        public avoidRadius: number
        private enemies: Enemy[] = [];
        private pos: Game.ƒ.Vector2;
        private myEnemy: Enemy;
        public cohesionWeight: number;
        public allignWeight: number;
        public avoidWeight: number;
        public toTargetWeight: number;
        public notToTargetWeight: number;

        constructor(_enemy: Enemy, _sightRadius: number, _avoidRadius: number, _cohesionWeight: number, _allignWeight: number, _avoidWeight: number, _toTargetWeight: number, _notToTargetWeight: number) {
            this.pos = _enemy.mtxLocal.translation.toVector2();
            this.myEnemy = _enemy;
            this.sightRadius = _sightRadius;
            this.avoidRadius = _avoidRadius;
            this.cohesionWeight = _cohesionWeight;
            this.allignWeight = _allignWeight;
            this.avoidWeight = _avoidWeight;
            this.toTargetWeight = _toTargetWeight;
            this.notToTargetWeight = _notToTargetWeight;
        }

        update() {
            this.enemies = Game.enemies;
            this.pos = this.myEnemy.mtxLocal.translation.toVector2();
            this.findNeighbours();
        }


        private findNeighbours() {
            this.currentNeighbours = [];
            this.enemies.forEach(enem => {
                if (this.myEnemy.netId != enem.netId) {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.sightRadius) {
                        this.currentNeighbours.push(enem);
                    }
                }
            })
        }

        public calculateCohesionMove(): Game.ƒ.Vector2 {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let cohesionMove: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    cohesionMove = Game.ƒ.Vector2.SUM(cohesionMove, enem.mtxLocal.translation.toVector2());
                })
                cohesionMove.scale(1 / this.currentNeighbours.length);
                cohesionMove.subtract(this.pos);
                cohesionMove = Calculation.getRotatedVectorByAngle2D(this.myEnemy.moveDirection, Calculation.calcDegree(this.myEnemy.mtxLocal.translation, cohesionMove.toVector3()) / 10).toVector2()
                return cohesionMove;
            }
        }

        public calculateAllignmentMove(): Game.ƒ.Vector2 {
            if (this.currentNeighbours.length <= 0) {
                return this.myEnemy.moveDirection.toVector2();
            }
            else {
                let allignmentMove: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    allignmentMove = Game.ƒ.Vector2.SUM(allignmentMove, enem.moveDirection.toVector2());
                })
                allignmentMove.scale(1 / this.currentNeighbours.length);
                return allignmentMove;
            }
        }

        public calculateAvoidanceMove(): Game.ƒ.Vector2 {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let avoidanceMove: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
                let nAvoid: number = 0;
                this.currentNeighbours.forEach(enem => {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.avoidRadius) {
                        nAvoid++;
                        avoidanceMove = Game.ƒ.Vector2.SUM(avoidanceMove, Game.ƒ.Vector2.DIFFERENCE(this.pos, enem.mtxLocal.translation.toVector2()));
                    }
                })
                if (nAvoid > 0) {
                    avoidanceMove.scale(1 / nAvoid);
                }
                return avoidanceMove;
            }
        }

        public doStuff(): Game.ƒ.Vector2 {
            let cohesion: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let avoid: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let allign: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();

            let target = this.myEnemy.moveSimple(this.myEnemy.target);
            if (target.magnitudeSquared > this.toTargetWeight * this.toTargetWeight) {
                target.normalize;
                target.scale(this.toTargetWeight);
            }

            let notToTarget = this.myEnemy.moveAway(this.myEnemy.target)
            if (notToTarget.magnitudeSquared > this.notToTargetWeight * this.notToTargetWeight) {
                notToTarget.normalize;
                notToTarget.scale(this.notToTargetWeight);
            }

            cohesion = this.calculateCohesionMove();
            if (cohesion.magnitudeSquared > this.cohesionWeight * this.cohesionWeight) {
                cohesion.normalize;
                cohesion.scale(this.cohesionWeight);
            }
            avoid = this.calculateAvoidanceMove();
            if (avoid.magnitudeSquared > this.avoidWeight * this.avoidWeight) {
                avoid.normalize;
                avoid.scale(this.avoidWeight);
            }
            allign = this.calculateAllignmentMove();
            if (allign.magnitudeSquared > this.allignWeight * this.allignWeight) {
                allign.normalize;
                allign.scale(this.allignWeight);
            }

            let move = Game.ƒ.Vector2.SUM(notToTarget, target, cohesion, avoid, allign);
            return move;
        }
    }
}


