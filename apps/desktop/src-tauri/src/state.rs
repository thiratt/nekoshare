use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::{Arc, OnceLock};

static INSTANCE: OnceLock<GlobalState> = OnceLock::new();

pub struct GlobalState {
    map: HashMap<TypeId, Arc<dyn Any + Send + Sync>>,
}

impl GlobalState {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
        }
    }

    pub fn register<T: Any + Send + Sync>(mut self, service: T) -> Self {
        self.map.insert(TypeId::of::<T>(), Arc::new(service));
        self
    }

    pub fn init(self) {
        if INSTANCE.set(self).is_err() {
            panic!("GlobalState has already been initialized!");
        }
    }

    pub fn get<T: Any + Send + Sync>() -> Arc<T> {
        let state = INSTANCE
            .get()
            .expect("GlobalState not initialized! Call .init() first.");

        let service = state
            .map
            .get(&TypeId::of::<T>())
            .unwrap_or_else(|| panic!("Service {} not registered!", std::any::type_name::<T>()));

        service
            .clone()
            .downcast::<T>()
            .expect("Failed to downcast type")
    }
}
