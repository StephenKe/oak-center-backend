export const TASK_STATUS = {
	CREATING: 'CREATING',
	EXECUTING: 'EXECUTING',
	CANCELING: 'CANCELING',
	FAILED: 'FAILED',
};

export const convertToResult = (data) => ({ result: data });
export const errorToResult = (error) => ( { code: error.code, message: error.message });
