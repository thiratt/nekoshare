import { toast as sonnerToast } from "sonner";

interface UseToastReturn {
	toast: typeof sonnerToast;
}

const useToast = (): UseToastReturn => {
	return {
		toast: sonnerToast,
	};
};

export { useToast };
