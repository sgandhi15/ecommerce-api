import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MAX_SIZE_IN_BYTES = 1000000;

@ValidatorConstraint({ async: false })
export class IsBase64ImageConstraint implements ValidatorConstraintInterface {
  validate(base64Image: any) {
    if (typeof base64Image !== 'string') {
      return false;
    }

    const base64Regex = /^data:image\/(jpeg|png|gif);base64,/;
    if (!base64Regex.test(base64Image)) {
      return false;
    }

    const base64Data = base64Image.replace(base64Regex, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return buffer.length <= MAX_SIZE_IN_BYTES;
  }

  defaultMessage() {
    return 'Image must be a valid Base64 data URL (jpeg, png, or gif) and be less than 1MB.';
  }
}

export function IsBase64Image(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBase64ImageConstraint,
    });
  };
}
