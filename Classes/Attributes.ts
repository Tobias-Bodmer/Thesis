namespace Entity {
    export class Attributes {

        public healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number;
        hitable: boolean = true;
        public speed: number;
        public attackPoints: number;
        public coolDownReduction: number = 1;
        public scale: number;


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _cooldownReduction?: number) {
            this.scale = _scale;
            this.healthPoints = _healthPoints * (100 + (10 * this.scale)) / 100;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints * this.scale;
            this.speed = _speed / this.scale;
            this.knockbackForce = _knockbackForce
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
        }
    }
}