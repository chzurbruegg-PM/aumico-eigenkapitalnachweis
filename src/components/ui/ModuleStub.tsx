interface ModuleStubProps {
  title: string;
}

export function ModuleStub({ title }: ModuleStubProps) {
  return (
    <div className="empty">
      <div className="ic" />
      <h4>{title}</h4>
      <div>Dieser Bereich ist Teil des Prototyps und in dieser Version nicht ausgebaut.</div>
    </div>
  );
}
