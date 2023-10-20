export enum PaymentType {
  CASH = "CASH",
  DEBIT_CARD = "DEBIT_CARD",
  CREDIT_CARD = "CREDIT_CARD",
}

export enum ShippingType {
  ECONOMIC = "ECONOMIC",
  URGENT = "URGENT",
}

export enum CarrierType {
  CORREIOS = "CORREIOS",
  SEDEX = "SEDEX",
}

export interface OrderRequest {
  email: string;
  productsIds: string[];
  paymentType: PaymentType;
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
}

export interface OrderProductResponse {
  code: string;
  price: number;
}

export interface OrderResponse {
  id: string;
  email: string;
  billing: {
    payment: PaymentType;
    totalPrice: number;
  };
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
  createdAt: string;
  products?: OrderProductResponse[];
}
