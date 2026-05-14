export const FieldError = ({ message }: { message?: string }) => {
  return message ? <p className="field-error">{message}</p> : null;
};
