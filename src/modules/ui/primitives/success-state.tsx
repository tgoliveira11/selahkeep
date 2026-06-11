import { Alert } from "./alert";

interface SuccessStateProps {
  message: string;
}

export function SuccessState({ message }: SuccessStateProps) {
  return (
    <Alert variant="success" role="status">
      {message}
    </Alert>
  );
}
