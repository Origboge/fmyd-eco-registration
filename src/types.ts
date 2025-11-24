import * as React from 'react';

export interface RegistrationFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  sex: string;
  stateOfOrigin:string;
  state: string;
  lga: string;
  address: string;
  landmark: string;
  trainingArea: string;
  passport?: FileList;
  nin?: FileList;
}

export interface StateLGAs {
  [key: string]: string[];
}

export interface FeatureItem {
  title: string;
  icon: React.ReactNode;
  desc: string;
}