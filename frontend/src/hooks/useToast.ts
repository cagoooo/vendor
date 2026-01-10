import Swal from 'sweetalert2';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
});

export function useToast() {
    const success = (message: string) => {
        Toast.fire({ icon: 'success', title: message });
    };

    const error = (message: string) => {
        Toast.fire({ icon: 'error', title: message });
    };

    const warning = (message: string) => {
        Toast.fire({ icon: 'warning', title: message });
    };

    const info = (message: string) => {
        Toast.fire({ icon: 'info', title: message });
    };

    return { success, error, warning, info };
}

// 非 Hook 版本，可在任何地方使用
export const toast = {
    success: (message: string) => Toast.fire({ icon: 'success', title: message }),
    error: (message: string) => Toast.fire({ icon: 'error', title: message }),
    warning: (message: string) => Toast.fire({ icon: 'warning', title: message }),
    info: (message: string) => Toast.fire({ icon: 'info', title: message }),
};
