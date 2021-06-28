/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

export interface HeadingField {
  type: "heading";
  label: string;
}

export interface SubtitleField {
  type: "subtitle";
  label: string;
}

export interface StringInputField {
  type: "string-input";
  variable: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  info?: string;
}

export type FormField = HeadingField|SubtitleField|StringInputField;

export interface Section {
  name: string;
  contents: FormField[];
}

export interface Tab {
  name: string;
  label: string;
  sections: Section[];
}

export interface PorterFormData {
  name: string;
  hasSource: true;
  tabs: Tab[];
}

// internal field state interfaces

export interface StringInputFieldState {
}

export type PorterFormFieldFieldState = StringInputFieldState;

// reducer interfaces

export interface PorterFormFieldValidationState {
  loading: boolean;
  error: boolean;
  validated: boolean;
  touched: boolean;
}

export interface PorterFormVariableList {
  [key: string]: any
}

export interface PorterFormState {
  components: {
    [key: string]: PorterFormFieldFieldState
  }
  variables: PorterFormVariableList
  validation: {
    [key: string]: PorterFormFieldValidationState
  }
}

export interface PorterFormInitFieldAction {
  type: "init-field",
  id: string;
  initValue: PorterFormFieldFieldState;
  initValidation?: Partial<PorterFormFieldValidationState>
}

export interface PorterFormUpdateFieldAction {
  type: "update-field",
  id: string;
  updateFunc: (prev: PorterFormFieldFieldState) => PorterFormFieldFieldState;
}

export interface PorterFormMutateVariablesAction {
  type: "mutate-vars",
  mutateFunc: (prev: PorterFormVariableList) => PorterFormVariableList;
}

export type PorterFormAction = PorterFormInitFieldAction|PorterFormUpdateFieldAction|PorterFormMutateVariablesAction;
