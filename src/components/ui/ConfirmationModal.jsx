export default function ConfirmationModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = "Confirm",
    confirmButtonClass = "bg-red-600 hover:bg-red-700"
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-2">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-lg ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}