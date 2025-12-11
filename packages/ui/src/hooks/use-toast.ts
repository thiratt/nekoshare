import { toast } from "sonner";

interface UseToastReturn {
  toasts: typeof toast;
}

const useToast = (): UseToastReturn => {
	return {
		toasts: toast,
	};
};

export { useToast };
