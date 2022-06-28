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
        public obsticalAvoidWeight: number = 1.5;

        private obsticalCollider: Collider.Collider;

        constructor(_enemy: Enemy, _sightRadius: number, _avoidRadius: number, _cohesionWeight: number, _allignWeight: number, _avoidWeight: number, _toTargetWeight: number, _notToTargetWeight: number, _obsticalAvoidWeight?: number) {
            this.pos = _enemy.mtxLocal.translation.toVector2();
            this.myEnemy = _enemy;
            this.sightRadius = _sightRadius;
            this.avoidRadius = _avoidRadius;
            this.cohesionWeight = _cohesionWeight;
            this.allignWeight = _allignWeight;
            this.avoidWeight = _avoidWeight;
            this.toTargetWeight = _toTargetWeight;
            this.notToTargetWeight = _notToTargetWeight;
            if (_obsticalAvoidWeight != null) {
                this.obsticalAvoidWeight = _obsticalAvoidWeight;
            }

            this.obsticalCollider = new Collider.Collider(this.pos, this.myEnemy.collider.getRadius * 1.75, this.myEnemy.netId);
        }

        update() {
            this.enemies = Game.enemies;
            this.pos = this.myEnemy.mtxLocal.translation.toVector2();
            this.obsticalCollider.position = this.pos;
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

        private calculateCohesionMove(): Game.ƒ.Vector2 {
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
                
                let newDirection = ƒ.Vector3.DIFFERENCE(cohesionMove.toVector3(), this.myEnemy.mtxLocal.translation);
                if (newDirection.magnitude > 0) {
                    newDirection.normalize();
                }

                let rotateAmount2: number = ƒ.Vector3.CROSS(newDirection, this.myEnemy.moveDirection).z;
                if (this.myEnemy.moveDirection.magnitudeSquared > 0) {
                    cohesionMove = Calculation.getRotatedVectorByAngle2D(this.myEnemy.moveDirection, -rotateAmount2 * 0.01).toVector2();

                }

                return cohesionMove;
            }
        }

        private calculateAllignmentMove(): Game.ƒ.Vector2 {
            if (this.currentNeighbours.length <= 0) {
                return this.myEnemy.moveDirection.toVector2();
            }
            else {
                let allignmentMove: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    allignmentMove.add(enem.moveDirection.toVector2());
                })
                allignmentMove.scale(1 / this.currentNeighbours.length);
                return allignmentMove;
            }
        }

        private calculateAvoidanceMove(): Game.ƒ.Vector2 {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let avoidanceMove: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
                let nAvoid: number = 0;
                this.currentNeighbours.forEach(enem => {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.avoidRadius) {
                        nAvoid++;
                        avoidanceMove.add(Game.ƒ.Vector2.DIFFERENCE(this.pos, enem.mtxLocal.translation.toVector2()));
                    }
                })
                if (nAvoid > 0) {
                    avoidanceMove.scale(1 / nAvoid);
                }
                return avoidanceMove;
            }
        }

        private calculateObsticalAvoidanceMove(): Game.ƒ.Vector2 {
            let obsticals: Game.ƒ.Node[] = [];
            Game.currentRoom.walls.forEach(elem => {
                obsticals.push(elem);
            });
            Game.currentRoom.obsticals.forEach(elem => {
                obsticals.push(elem);
            });
            let returnVector: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let nAvoid: number = 0;

            obsticals.forEach(obstical => {
                if ((<any>obstical).collider instanceof Game.ƒ.Rectangle && this.obsticalCollider.collidesRect((<any>obstical).collider)) {
                    let move: Game.ƒ.Vector2 = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    move.normalize();

                    let intersection: Game.ƒ.Rectangle = this.obsticalCollider.getIntersectionRect((<any>obstical).collider);
                    let areaBeforeMove: number = intersection.width * intersection.height;

                    this.obsticalCollider.position.add(new Game.ƒ.Vector2(move.x, 0));
                    if (this.obsticalCollider.collidesRect((<any>obstical).collider)) {
                        intersection = this.obsticalCollider.getIntersectionRect((<any>obstical).collider);
                        let afterBeforeMove: number = intersection.width * intersection.height;

                        if (areaBeforeMove <= afterBeforeMove) {
                            returnVector.add(new Game.ƒ.Vector2(0, move.y));
                        } else {
                            returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                        }
                    } else {
                        returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                    }

                    this.obsticalCollider.position.subtract(new Game.ƒ.Vector2(move.x, 0));

                    nAvoid++;
                }
                if ((<any>obstical).collider instanceof Collider.Collider && this.obsticalCollider.collides((<any>obstical).collider)) {
                    let move: Game.ƒ.Vector2 = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    let localAway: Game.ƒ.Vector2 = Game.ƒ.Vector2.SUM(move, this.myEnemy.mtxLocal.translation.toVector2());

                    let distancePos = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), 135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    let distanceNeg = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), -135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));

                    if (distanceNeg.magnitudeSquared > distancePos.magnitudeSquared) {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), 135).toVector2());
                    } else {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), -135).toVector2());
                    }

                    returnVector.add(move);

                    nAvoid++;
                }
            })

            if (nAvoid > 0) {
                returnVector.scale(1 / nAvoid);
            }

            return returnVector;
        }

        public getMoveVector(): Game.ƒ.Vector2 {
            let target: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let notToTarget: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let cohesion: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let avoid: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let allign: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();
            let obsticalAvoid: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();


            target = this.myEnemy.moveSimple(this.myEnemy.target);
            if (target.magnitudeSquared > this.toTargetWeight * this.toTargetWeight) {
                target.normalize();
                target.scale(this.toTargetWeight);
            }

            notToTarget = this.myEnemy.moveAway(this.myEnemy.target);
            if (notToTarget.magnitudeSquared > this.notToTargetWeight * this.notToTargetWeight) {
                notToTarget.normalize();
                notToTarget.scale(this.notToTargetWeight);
            }


            cohesion = this.calculateCohesionMove();
            if (cohesion.magnitudeSquared > this.cohesionWeight * this.cohesionWeight) {
                cohesion.normalize();
                cohesion.scale(this.cohesionWeight);
            }
            avoid = this.calculateAvoidanceMove();
            if (avoid.magnitudeSquared > 0) {
                avoid.normalize();
                avoid.scale(this.avoidWeight);
            }
            allign = this.calculateAllignmentMove();
            if (allign.magnitudeSquared > this.allignWeight * this.allignWeight) {
                allign.normalize();
                allign.scale(this.allignWeight);
            }

            obsticalAvoid = this.calculateObsticalAvoidanceMove();
            if (obsticalAvoid.magnitudeSquared > this.obsticalAvoidWeight * this.obsticalAvoidWeight) {
                obsticalAvoid.normalize();
                obsticalAvoid.scale(this.obsticalAvoidWeight);
            }

            let move = Game.ƒ.Vector2.SUM(notToTarget, target, cohesion, avoid, allign, obsticalAvoid);

            return move;
        }
    }
}


