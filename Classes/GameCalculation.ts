namespace Calculation {
    export function getCloserAvatarPosition(_startPoint: ƒ.Vector3): ƒ.Vector3 {
        let target = Game.avatar1;


        let distancePlayer1 = _startPoint.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
        let distancePlayer2 = _startPoint.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);

        if (distancePlayer1 < distancePlayer2) {
            target = Game.avatar1;
        }
        else {
            target = Game.avatar2;
        }


        return target.cmpTransform.mtxLocal.translation;
    }


    export function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number {
        let xDistance: number = _target.x - _center.x;
        let yDistance: number = _target.y - _center.y;
        let degrees: number = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;

    }
    export function getRotatedVectorByAngle2D(_vectorToRotate: ƒ.Vector3, _angle: number): ƒ.Vector3 {
        let angleToRadian: number = _angle * (Math.PI / 180);

        let newX = _vectorToRotate.x * Math.cos(angleToRadian) - _vectorToRotate.y * Math.sin(angleToRadian);
        let newY = _vectorToRotate.x * Math.sin(angleToRadian) + _vectorToRotate.y * Math.cos(angleToRadian);

        return new ƒ.Vector3(newX, newY, _vectorToRotate.z);
    }

    export function addPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number {
        return _baseValue * ((100 + _percentageAmount) / 100);
    }
    export function subPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number {
        return _baseValue * (100 / (100 + _percentageAmount));
    }

    export function clampNumber(_number: number, _min: number, _max: number) {
        return Math.max(_min, Math.min(_number, _max));
    }


}