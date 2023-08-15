import { match } from "ts-pattern";
import { z } from "zod";
import {
  SerializedAutoscaling,
  SerializedHealthcheck,
  autoscalingValidator,
  healthcheckValidator,
  deserializeAutoscaling,
  deserializeHealthCheck,
  serializeAutoscaling,
  serializeHealth,
} from "./values";
import { Service, ServiceType } from "@porter-dev/api-contracts";

// ServiceString is a string value in a service that can be read-only or editable
export const serviceStringValidator = z.object({
  readOnly: z.boolean(),
  value: z.string(),
});
export type ServiceString = z.infer<typeof serviceStringValidator>;

// ServiceNumber is a number value in a service that can be read-only or editable
export const serviceNumberValidator = z.object({
  readOnly: z.boolean(),
  value: z.number(),
});
export type ServiceNumber = z.infer<typeof serviceNumberValidator>;

// ServiceBoolean is a boolean value in a service that can be read-only or editable
export const serviceBooleanValidator = z.object({
  readOnly: z.boolean(),
  value: z.boolean(),
});
export type ServiceBoolean = z.infer<typeof serviceBooleanValidator>;

// ServiceArray is an array of ServiceStrings
const serviceArrayValidator = z.array(
  z.object({
    key: z.string(),
    value: serviceStringValidator,
  })
);
export type ServiceArray = z.infer<typeof serviceArrayValidator>;

// ServiceField is a helper to create a ServiceString, ServiceNumber, or ServiceBoolean
export const ServiceField = {
  string: (defaultValue: string, overrideValue?: string): ServiceString => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
  number: (defaultValue: number, overrideValue?: number): ServiceNumber => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
  boolean: (defaultValue: boolean, overrideValue?: boolean): ServiceBoolean => {
    return {
      readOnly: !!overrideValue,
      value: overrideValue ?? defaultValue,
    };
  },
};

// serviceValidator is the validator for a ClientService
// This is used to validate a service when creating or updating an app
export const serviceValidator = z.object({
  run: serviceStringValidator,
  instances: serviceNumberValidator,
  port: serviceNumberValidator,
  cpuCores: serviceNumberValidator,
  ramMegabytes: serviceNumberValidator,
  config: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("web"),
      autoscaling: autoscalingValidator.optional(),
      domains: z.array(
        z.object({
          name: serviceStringValidator,
        })
      ),
      healthCheck: healthcheckValidator.optional(),
    }),
    z.object({
      type: z.literal("worker"),
      autoscaling: autoscalingValidator.optional(),
    }),
    z.object({
      type: z.literal("job"),
      allowConcurrent: serviceBooleanValidator,
      cron: serviceStringValidator,
    }),
  ]),
});

export type ClientService = z.infer<typeof serviceValidator>;

// SerializedService is just the values of a Service without any override information
// This is used as an intermediate step to convert a ClientService to a protobuf Service
export type SerializedService = {
  run: string;
  instances: number;
  port: number;
  cpuCores: number;
  ramMegabytes: number;
  config:
    | {
        type: "web";
        domains: {
          name: string;
        }[];
        autoscaling?: SerializedAutoscaling;
        healthCheck?: SerializedHealthcheck;
      }
    | {
        type: "worker";
        autoscaling?: SerializedAutoscaling;
      }
    | {
        type: "job";
        allowConcurrent: boolean;
        cron: string;
      };
};

// serializeService converts a ClientService to a SerializedService
// A SerializedService holds just the values of a ClientService
// These values can be used to create a protobuf Service
export function serializeService(service: ClientService): SerializedService {
  return match(service.config)
    .with({ type: "web" }, (config) =>
      Object.freeze({
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "web" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
          healthCheck: serializeHealth({ health: config.healthCheck }),
          domains: config.domains.map((domain) => ({
            name: domain.name.value,
          })),
        },
      })
    )
    .with({ type: "worker" }, (config) =>
      Object.freeze({
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "worker" as const,
          autoscaling: serializeAutoscaling({
            autoscaling: config.autoscaling,
          }),
        },
      })
    )
    .with({ type: "job" }, (config) =>
      Object.freeze({
        run: service.run.value,
        instances: service.instances.value,
        port: service.port.value,
        cpuCores: service.cpuCores.value,
        ramMegabytes: service.ramMegabytes.value,
        config: {
          type: "job" as const,
          allowConcurrent: config.allowConcurrent.value,
          cron: config.cron.value,
        },
      })
    )
    .exhaustive();
}

// deserializeService converts a SerializedService to a ClientService
// A deserialized ClientService represents the state of a service in the UI and which fields are editable
export function deserializeService(
  service: SerializedService,
  override?: SerializedService
): ClientService {
  const baseService = {
    run: ServiceField.string(service.run, override?.run),
    instances: ServiceField.number(service.instances, override?.instances),
    port: ServiceField.number(service.port, override?.port),
    cpuCores: ServiceField.number(service.cpuCores, override?.cpuCores),
    ramMegabytes: ServiceField.number(
      service.ramMegabytes,
      override?.ramMegabytes
    ),
  };

  return match(service.config)
    .with({ type: "web" }, (config) => {
      const overrideWebConfig =
        override?.config.type == "web" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "web" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            override: overrideWebConfig?.autoscaling,
          }),
          healthCheck: deserializeHealthCheck({
            health: config.healthCheck,
            override: overrideWebConfig?.healthCheck,
          }),
          domains: config.domains.map((domain) => ({
            name: ServiceField.string(
              domain.name,
              overrideWebConfig?.domains.find(
                (overrideDomain) => overrideDomain.name == domain.name
              )?.name
            ),
          })),
        },
      };
    })
    .with({ type: "worker" }, (config) => {
      const overrideWorkerConfig =
        override?.config.type == "worker" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "worker" as const,
          autoscaling: deserializeAutoscaling({
            autoscaling: config.autoscaling,
            override: overrideWorkerConfig?.autoscaling,
          }),
        },
      };
    })
    .with({ type: "job" }, (config) => {
      const overrideJobConfig =
        override?.config.type == "job" ? override.config : undefined;

      return {
        ...baseService,
        config: {
          type: "job" as const,
          allowConcurrent: ServiceField.boolean(
            config.allowConcurrent,
            overrideJobConfig?.allowConcurrent
          ),
          cron: ServiceField.string(config.cron, overrideJobConfig?.cron),
        },
      };
    })
    .exhaustive();
}

// getServiceTypeEnumProto converts the type of a ClientService to the protobuf ServiceType enum
export const getServiceTypeEnumProto = (type: "web" | "worker" | "job") => {
  return match(type)
    .with("web", () => ServiceType.WEB)
    .with("worker", () => ServiceType.WORKER)
    .with("job", () => ServiceType.JOB)
    .exhaustive();
};

// getServiceProto converts a SerializedService to the protobuf Service
// This is used as an intermediate step to convert a ClientService to a protobuf Service
export function getServiceProto(service: SerializedService) {
  return match(service.config)
    .with(
      { type: "web" },
      (config) =>
        new Service({
          ...service,
          type: getServiceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "webConfig",
          },
        })
    )
    .with(
      { type: "worker" },
      (config) =>
        new Service({
          ...service,
          type: getServiceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "workerConfig",
          },
        })
    )
    .with(
      { type: "job" },
      (config) =>
        new Service({
          ...service,
          type: getServiceTypeEnumProto(config.type),
          config: {
            value: {
              ...config,
            },
            case: "jobConfig",
          },
        })
    )
    .exhaustive();
}

// getSerializedServiceFromProto converts a protobuf Service to a SerializedService
// This is used as an intermediate step to convert a protobuf Service to a ClientService
export function getSerializedServiceFromProto(
  service: Service
): SerializedService {
  const config = service.config;
  if (!config.case) {
    throw new Error("No case found on service config");
  }

  return match(config)
    .with({ case: "webConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "web" as const,
        ...value,
      },
    }))
    .with({ case: "workerConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "worker" as const,
        ...value,
      },
    }))
    .with({ case: "jobConfig" }, ({ value }) => ({
      ...service,
      config: {
        type: "job" as const,
        ...value,
      },
    }))
    .exhaustive();
}
